/**
 * Teamwork.com ↔ ChatGPT Bridge
 * 
 * Bridges Teamwork.com data to ChatGPT/OpenAI for intelligent queries, summaries, and insights.
 * This provides the functionality that the native ChatGPT connector would offer.
 */

import { TeamworkClient, TeamworkProject, TeamworkTask, TeamworkMilestone } from './client';
import { getLLMService } from '@/lib/support/llm-service';

export interface TeamworkContext {
  projects?: TeamworkProject[];
  tasks?: TeamworkTask[];
  milestones?: TeamworkMilestone[];
  timeEntries?: any[];
}

export interface ChatGPTQuery {
  question: string;
  context?: {
    projectIds?: string[];
    includeCompleted?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export class TeamworkChatGPTBridge {
  private teamworkClient: TeamworkClient;
  private llmService: ReturnType<typeof getLLMService>;

  constructor(teamworkClient: TeamworkClient) {
    this.teamworkClient = teamworkClient;
    this.llmService = getLLMService();
  }

  /**
   * Fetch relevant Teamwork data based on query context
   */
  private async fetchContext(query: ChatGPTQuery): Promise<TeamworkContext> {
    const context: TeamworkContext = {};

    // Fetch projects
    if (query.context?.projectIds && query.context.projectIds.length > 0) {
      context.projects = await Promise.all(
        query.context.projectIds.map((id) => this.teamworkClient.getProject(id))
      ).then((results) => results.filter((p): p is TeamworkProject => p !== null));
    } else {
      context.projects = await this.teamworkClient.getProjects();
    }

    // Fetch tasks
    context.tasks = await this.teamworkClient.getTasks(
      query.context?.projectIds?.[0],
      {
        includeCompleted: query.context?.includeCompleted,
      }
    );

    // Fetch milestones
    context.milestones = await this.teamworkClient.getMilestones(
      query.context?.projectIds?.[0]
    );

    // Fetch time entries if date range specified
    if (query.context?.dateRange) {
      context.timeEntries = await this.teamworkClient.getTimeEntries({
        projectId: query.context.projectIds?.[0],
        startDate: query.context.dateRange.start,
        endDate: query.context.dateRange.end,
      });
    }

    return context;
  }

  /**
   * Format Teamwork data as context for LLM
   */
  private formatContext(context: TeamworkContext): string {
    const parts: string[] = [];

    if (context.projects && context.projects.length > 0) {
      parts.push('## Projects\n');
      context.projects.forEach((project) => {
        parts.push(`- **${project.name}** (ID: ${project.id})`);
        if (project.description) {
          parts.push(`  ${project.description}`);
        }
        parts.push(`  Status: ${project.status}`);
        parts.push('');
      });
    }

    if (context.tasks && context.tasks.length > 0) {
      parts.push('## Tasks\n');
      context.tasks.forEach((task) => {
        parts.push(`- **${task.content}** (ID: ${task.id})`);
        if (task.description) {
          parts.push(`  ${task.description}`);
        }
        parts.push(`  Status: ${task.status}`);
        if (task.dueDate) {
          parts.push(`  Due: ${task.dueDate}`);
        }
        parts.push(`  Priority: ${task.priority}`);
        if (task.assignedTo && task.assignedTo.length > 0) {
          parts.push(`  Assigned to: ${task.assignedTo.join(', ')}`);
        }
        parts.push('');
      });
    }

    if (context.milestones && context.milestones.length > 0) {
      parts.push('## Milestones\n');
      context.milestones.forEach((milestone) => {
        parts.push(`- **${milestone.title}** (ID: ${milestone.id})`);
        if (milestone.description) {
          parts.push(`  ${milestone.description}`);
        }
        parts.push(`  Status: ${milestone.status}`);
        parts.push(`  Due: ${milestone.dueDate}`);
        if (milestone.completedDate) {
          parts.push(`  Completed: ${milestone.completedDate}`);
        }
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Answer a question about Teamwork data using ChatGPT
   */
  async answerQuestion(query: ChatGPTQuery): Promise<string> {
    // Fetch relevant context
    const context = await this.fetchContext(query);
    const formattedContext = this.formatContext(context);

    // Build system prompt
    const systemPrompt = `You are an AI assistant helping with Teamwork.com project management. 
You have access to the following Teamwork data:

${formattedContext}

Answer questions about projects, tasks, milestones, and work status based on this data.
Be concise, accurate, and actionable. If you don't have information, say so.`;

    // Generate answer
    const answer = await this.llmService.generateAnswer(
      systemPrompt,
      query.question
    );

    return answer;
  }

  /**
   * Generate a summary of Teamwork data
   */
  async generateSummary(options?: {
    projectIds?: string[];
    includeCompleted?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  }): Promise<string> {
    const context = await this.fetchContext({
      question: 'Generate a summary',
      context: options,
    });

    const formattedContext = this.formatContext(context);

    const systemPrompt = `You are an AI assistant summarizing Teamwork.com project data.

${formattedContext}

Generate a comprehensive summary including:
- Project status overview
- Key tasks and their status
- Upcoming milestones
- Any overdue items
- Overall project health

Be concise but informative.`;

    const summary = await this.llmService.generateAnswer(
      systemPrompt,
      'Generate a summary of the current project status, key tasks, milestones, and any concerns.'
    );

    return summary;
  }

  /**
   * Search and answer questions about Teamwork data
   */
  async searchAndAnswer(question: string): Promise<string> {
    // Use Teamwork search to find relevant items
    const searchResults = await this.teamworkClient.search(question);

    const context: TeamworkContext = {
      projects: searchResults.projects,
      tasks: searchResults.tasks,
      milestones: searchResults.milestones,
    };

    const formattedContext = this.formatContext(context);

    const systemPrompt = `You are an AI assistant helping with Teamwork.com. 
You searched for "${question}" and found:

${formattedContext}

Answer the user's question based on the search results.`;

    const answer = await this.llmService.generateAnswer(
      systemPrompt,
      question
    );

    return answer;
  }
}
