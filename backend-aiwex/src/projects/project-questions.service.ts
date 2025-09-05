import { Injectable } from "@nestjs/common";
import { ProjectQuestion , ProjectAnswer } from "./project.interface";

@Injectable()
export class ProjectQuestionsService {
  private readonly projectQuestions: ProjectQuestion[] = [
     {
      id: 'project-type',
      question: 'What type of project would you like to build?',
      type: 'select',
      options: [
        'Web Application',
        'Mobile App',
        'API/Backend Service',
        'E-commerce Platform',
        'Social Media App',
        'Dashboard/Analytics Tool',
        'Game',
        'AI/ML Application'
      ]
    },
    {
      id: 'project-purpose',
      question: 'What is the main purpose of your project?',
      type: 'text'
    },
    {
      id: 'target-users',
      question: 'Who are your target users?',
      type: 'text'
    },
    {
      id: 'core-features',
      question: 'Select the core features you need:',
      type: 'multiselect',
      options: [
        'User Authentication',
        'Payment Processing',
        'Real-time Chat',
        'File Upload/Storage',
        'Search Functionality',
        'Notifications',
        'Admin Panel',
        'API Integration',
        'Data Visualization',
        'Social Features'
      ]
    },
    {
      id: 'tech-preference',
      question: 'Do you have any technology preferences?',
      type: 'select',
      options: [
        'Modern (React/Node.js)',
        'Enterprise (Java/Spring)',
        'Microsoft (.NET/C#)',
        'Python-based',
        'No preference - recommend best fit'
      ]
    },
    {
      id: 'timeline',
      question: 'What is your expected timeline?',
      type: 'select',
      options: [
        '1 week (MVP)',
        '2-4 weeks (Basic)',
        '1-2 months (Standard)',
        '3+ months (Complex)'
      ]
    },
    {
      id: 'team-size',
      question: 'How would you like to participate?',
      type: 'select',
      options: [
        'I want to code actively',
        'I want to manage and review',
        'I want to test and provide feedback',
        'I want to observe and learn'
      ]
    }
  ];

  getQuestions(): ProjectQuestion[] {
    return this.projectQuestions;
  }

  extractProjectData(answers: ProjectAnswer[]) {
    const getAnswer = (id: string) => {
      const answer = answers.find(a => a.questionId === id);
      return answer?.answer || '';
    };

    return {
      type: getAnswer('project-type') as string,
      purpose: getAnswer('project-purpose') as string,
      targetUsers: getAnswer('target-users') as string,
      features: getAnswer('core-features') as string[],
      techPreference: getAnswer('tech-preference') as string,
      timeline: getAnswer('timeline') as string,
      participation: getAnswer('team-size') as string
    };
  }
}