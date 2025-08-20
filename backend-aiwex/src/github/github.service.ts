import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import * as simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private octokit: Octokit;
  private git = simpleGit.default();
  private tempDir = path.join(process.cwd(), 'temp-repos');

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.get<string>('GITHUB_TOKEN'),
    });
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error('Error creating temp directory:', error);
    }
  }

  async createRepository(name: string, description: string): Promise<any> {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: false,
        auto_init: true,
      });
      this.logger.log(`Successfully created repository: ${response.data.full_name}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error creating repository:', error);
      if (error.status === 422) {
        throw new Error(`Repository ${name} already exists or name is invalid`);
      }
      throw new Error('Failed to create repository');
    }
  }

  // Your existing pushCode method (keeping as-is for compatibility)
  async pushCode(repoName: string, files: Array<{ path: string; content: string }>): Promise<void> {
    const repoPath = path.join(this.tempDir, `${repoName}-${uuidv4()}`);
    const username = this.configService.get<string>('GITHUB_USERNAME');
    const token = this.configService.get<string>('GITHUB_TOKEN');
    
    try {
      // Clone repository
      await this.git.clone(
        `https://${token}@github.com/${username}/${repoName}.git`,
        repoPath,
      );

      // Change to repo directory
      const repoGit = simpleGit.default(repoPath);

      // Create and write files
      for (const file of files) {
        const filePath = path.join(repoPath, file.path);
        const dirPath = path.dirname(filePath);
        
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }

      // Add, commit and push
      await repoGit.add('.');
      await repoGit.commit('Initial commit by Developer AI Agent');
      await repoGit.push('origin', 'main');

      // Cleanup
      await fs.rm(repoPath, { recursive: true, force: true });
      this.logger.log(`Successfully pushed ${files.length} files to ${repoName}`);
    } catch (error) {
      this.logger.error('Error pushing code:', error);
      // Cleanup on error
      try {
        await fs.rm(repoPath, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.error('Cleanup error:', cleanupError);
      }
      throw new Error('Failed to push code to repository');
    }
  }

  // NEW: GitHub API-based file creation (better for single files and branches)
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main'
  ): Promise<any> {
    try {
      let sha: string | undefined;

      // Check if file already exists to get its SHA
      try {
        const { data: existingFile } = await this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        if ('sha' in existingFile) {
          sha = existingFile.sha;
          this.logger.log(`File ${path} exists, updating with SHA: ${sha}`);
        }
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
        this.logger.log(`File ${path} doesn't exist, creating new file`);
      }

      // Convert content to base64
      const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: contentBase64,
        branch,
        ...(sha && { sha }),
      });

      this.logger.log(`Successfully ${sha ? 'updated' : 'created'} file: ${path} on branch: ${branch}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating/updating file ${path}:`, error);
      throw new Error(`Failed to create/update file ${path}: ${error.message}`);
    }
  }

  // NEW: Create multiple files using GitHub API (alternative to pushCode)
  async createMultipleFiles(
    owner: string,
    repo: string,
    files: Array<{
      path: string;
      content: string;
      message?: string;
    }>,
    branch: string = 'main'
  ): Promise<any[]> {
    const results: any[] = [];

    for (const file of files) {
      try {
        const result = await this.createOrUpdateFile(
          owner,
          repo,
          file.path,
          file.content,
          file.message || `Add ${file.path}`,
          branch
        );
        results.push({ success: true, file: file.path, result });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.error(`Failed to create file ${file.path}:`, error);
        results.push({ success: false, file: file.path, error: error.message });
      }
    }

    this.logger.log(`Batch file operation completed: ${results.filter(r => r.success).length}/${files.length} successful`);
    return results;
  }

  // NEW: Push code to specific branch (enhanced version of your pushCode)
  async pushCodeToBranch(
    repoName: string, 
    files: Array<{ path: string; content: string }>, 
    branch: string = 'main',
    commitMessage: string = 'Add files by AI Agent'
  ): Promise<void> {
    const repoPath = path.join(this.tempDir, `${repoName}-${branch}-${uuidv4()}`);
    const username = this.configService.get<string>('GITHUB_USERNAME');
    const token = this.configService.get<string>('GITHUB_TOKEN');
    
    try {
      // Clone repository
      await this.git.clone(
        `https://${token}@github.com/${username}/${repoName}.git`,
        repoPath,
      );

      // Change to repo directory
      const repoGit = simpleGit.default(repoPath);

      // Checkout or create branch
      try {
        await repoGit.checkout(branch);
      } catch (error) {
        // Branch doesn't exist, create it
        await repoGit.checkoutLocalBranch(branch);
      }

      // Create and write files
      for (const file of files) {
        const filePath = path.join(repoPath, file.path);
        const dirPath = path.dirname(filePath);
        
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }

      // Check if there are any changes
      const status = await repoGit.status();
      if (status.files.length === 0) {
        this.logger.warn(`No changes detected in ${repoName} on branch ${branch}`);
        await fs.rm(repoPath, { recursive: true, force: true });
        return;
      }

      // Add, commit and push
      await repoGit.add('.');
      await repoGit.commit(commitMessage);
      await repoGit.push('origin', branch);

      // Cleanup
      await fs.rm(repoPath, { recursive: true, force: true });
      this.logger.log(`Successfully pushed ${files.length} files to ${repoName}:${branch}`);
    } catch (error) {
      this.logger.error('Error pushing code to branch:', error);
      // Cleanup on error
      try {
        await fs.rm(repoPath, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.error('Cleanup error:', cleanupError);
      }
      throw new Error(`Failed to push code to repository branch ${branch}`);
    }
  }

  // NEW: Get file content
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<{ content: string; sha: string }> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data)) {
        throw new Error(`Path ${path} is a directory, not a file`);
      }

      if (!('content' in data)) {
        throw new Error(`File ${path} has no content`);
      }

      const content = data.encoding === 'base64' 
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;

      return {
        content,
        sha: data.sha,
      };
    } catch (error) {
      this.logger.error(`Error getting file content for ${path}:`, error);
      
      if (error.status === 404) {
        throw new Error(`File ${path} not found in repository ${owner}/${repo}`);
      }
      
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  // NEW: Check if repository exists
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.repos.get({ owner, repo });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getRepository(owner: string, repo: string): Promise<any> {
    try {
      const response = await this.octokit.repos.get({ owner, repo });
      return response.data;
    } catch (error) {
      this.logger.error('Error getting repository:', error);
      throw new Error('Failed to get repository');
    }
  }

  async listUserRepositories(): Promise<any[]> {
    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'created',
        direction: 'desc',
        per_page: 30,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error listing repositories:', error);
      throw new Error('Failed to list repositories');
    }
  }

  // NEW: Utility method to choose between API and Git methods
  async addFilesToRepository(
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>,
    branch: string = 'main',
    commitMessage: string = 'Add files',
    useAPI: boolean = true // true for API method, false for Git method
  ): Promise<void> {
    if (useAPI) {
      // Use GitHub API method (better for small number of files)
      const fileOperations = files.map(file => ({
        ...file,
        message: `${commitMessage}: ${file.path}`
      }));
      await this.createMultipleFiles(owner, repo, fileOperations, branch);
    } else {
      // Use Git method (better for large number of files)
      await this.pushCodeToBranch(repo, files, branch, commitMessage);
    }
  }

  // NEW: Get branch information
  async getBranch(owner: string, repo: string, branch: string): Promise<any> {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch,
      });
      return data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Branch ${branch} not found in ${owner}/${repo}`);
      }
      throw new Error(`Failed to get branch info: ${error.message}`);
    }
  }

  // NEW: List repository contents
  async listRepositoryContents(
    owner: string,
    repo: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      this.logger.error(`Error listing repository contents for ${path}:`, error);
      throw new Error(`Failed to list repository contents: ${error.message}`);
    }
  }
}