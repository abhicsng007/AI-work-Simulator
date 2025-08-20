import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  sendTaskProgress(data: { taskId: string; status: string; progress: number }) {
    this.server.emit('taskProgress', data);
  }

  sendTaskUpdate(taskId: string, message: string) {
    this.server.emit('taskUpdate', { taskId, message, timestamp: new Date() });
  }

  sendCodeGenerated(data: { taskId: string; repositoryUrl: string; fileCount: number }) {
    this.server.emit('codeGenerated', data);
  }

  sendAgentMessage(data: { agentId: string; message: string; channel: string }) {
    this.server.emit('agentMessage', {
      ...data,
      timestamp: new Date(),
    });
  }

  sendLevelUp(data: { userId: string; newLevel: number; userName: string }) {
    this.server.emit('levelUp', data);
  }

  sendUserNotification(userId: string, notification: any) {
    this.server.emit('userNotification', { userId, notification });
  }

  sendProjectCreated(data: { projectId: string; projectName: string; repository: string }) {
    this.server.emit('projectCreated', data);
  }

  sendTaskStatusUpdate(data: { projectId: string; taskId: string; status: string }) {
    this.server.emit('taskStatusUpdate', data);
  }

  sendPullRequestCreated(data: { projectId: string; taskId: string; prNumber: number; prUrl: string }) {
    this.server.emit('pullRequestCreated', data);
  }

  sendAgentWorkUpdate(data: { agentId: string; taskId: string; status: string; activity: string; progress: number }) {
    this.server.emit('agentWorkUpdate', data);
  }

  @SubscribeMessage('getAgentWorkStatus')
  async handleGetAgentWorkStatus(client: Socket) {
    // This would call the agent work service to get current status
    client.emit('agentWorkStatusResponse', { status: 'Method to be implemented' });
  }

  @SubscribeMessage('joinChannel')
  handleJoinChannel(client: Socket, channel: string) {
    client.join(channel);
    console.log(`Client ${client.id} joined channel: ${channel}`);
  }

  @SubscribeMessage('leaveChannel')
  handleLeaveChannel(client: Socket, channel: string) {
    client.leave(channel);
    console.log(`Client ${client.id} left channel: ${channel}`);
  }
}