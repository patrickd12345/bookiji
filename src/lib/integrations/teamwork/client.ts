/**
 * Teamwork.com API Client
 * 
 * Provides integration with Teamwork.com API to fetch projects, tasks, milestones, etc.
 * Used to bridge Teamwork data to ChatGPT/OpenAI for intelligent queries and summaries.
 * 
 * API Documentation: https://developer.teamwork.com/
 */

export interface TeamworkConfig {
  apiKey: string;
  subdomain: string;
  baseUrl?: string;
}

export interface TeamworkProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdOn: string;
  lastChangedOn: string;
}

export interface TeamworkTask {
  id: string;
  content: string;
  description?: string;
  projectId: string;
  projectName?: string;
  status: 'new' | 'open' | 'inprogress' | 'completed' | 'closed';
  dueDate?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  assignedTo?: string[];
  tags?: string[];
  createdOn: string;
  updatedOn: string;
}

export interface TeamworkMilestone {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  status: 'upcoming' | 'late' | 'completed';
  dueDate: string;
  completedDate?: string;
}

export interface TeamworkTimeEntry {
  id: string;
  description: string;
  projectId: string;
  taskId?: string;
  personId: string;
  date: string;
  hours: number;
  minutes: number;
}

export class TeamworkClient {
  private config: TeamworkConfig;
  private baseUrl: string;

  constructor(config: TeamworkConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || `https://${config.subdomain}.teamwork.com`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.apiKey}:x`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Teamwork API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<TeamworkProject[]> {
    const response = await this.request<{ projects: TeamworkProject[] }>(
      '/projects.json'
    );
    return response.projects || [];
  }

  /**
   * Get tasks for a project or all tasks
   */
  async getTasks(projectId?: string, options?: {
    status?: string;
    includeCompleted?: boolean;
    pageSize?: number;
  }): Promise<TeamworkTask[]> {
    let endpoint = '/tasks.json';
    const params = new URLSearchParams();
    
    if (projectId) {
      params.append('projectIds', projectId);
    }
    
    if (options?.status) {
      params.append('status', options.status);
    }
    
    if (options?.includeCompleted === false) {
      params.append('includeCompleted', 'false');
    }
    
    if (options?.pageSize) {
      params.append('pageSize', options.pageSize.toString());
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request<{ todoItems: TeamworkTask[] }>(endpoint);
    return response.todoItems || [];
  }

  /**
   * Get milestones for a project or all milestones
   */
  async getMilestones(projectId?: string): Promise<TeamworkMilestone[]> {
    let endpoint = '/milestones.json';
    if (projectId) {
      endpoint += `?projectId=${projectId}`;
    }

    const response = await this.request<{ milestones: TeamworkMilestone[] }>(
      endpoint
    );
    return response.milestones || [];
  }

  /**
   * Get time entries
   */
  async getTimeEntries(options?: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TeamworkTimeEntry[]> {
    let endpoint = '/time_entries.json';
    const params = new URLSearchParams();
    
    if (options?.projectId) {
      params.append('projectId', options.projectId);
    }
    
    if (options?.startDate) {
      params.append('fromdate', options.startDate);
    }
    
    if (options?.endDate) {
      params.append('todate', options.endDate);
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request<{ timeEntries: TeamworkTimeEntry[] }>(
      endpoint
    );
    return response.timeEntries || [];
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<TeamworkProject | null> {
    try {
      const response = await this.request<{ project: TeamworkProject }>(
        `/projects/${projectId}.json`
      );
      return response.project || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<TeamworkTask | null> {
    try {
      const response = await this.request<{ todoItem: TeamworkTask }>(
        `/tasks/${taskId}.json`
      );
      return response.todoItem || null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search across projects, tasks, and milestones
   */
  async search(query: string): Promise<{
    projects: TeamworkProject[];
    tasks: TeamworkTask[];
    milestones: TeamworkMilestone[];
  }> {
    // Teamwork doesn't have a unified search, so we search each type
    const [projects, tasks, milestones] = await Promise.all([
      this.getProjects(),
      this.getTasks(),
      this.getMilestones(),
    ]);

    const queryLower = query.toLowerCase();
    
    return {
      projects: projects.filter(
        (p) =>
          p.name.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower)
      ),
      tasks: tasks.filter(
        (t) =>
          t.content.toLowerCase().includes(queryLower) ||
          t.description?.toLowerCase().includes(queryLower)
      ),
      milestones: milestones.filter(
        (m) =>
          m.title.toLowerCase().includes(queryLower) ||
          m.description?.toLowerCase().includes(queryLower)
      ),
    };
  }
}

/**
 * Create Teamwork client from environment variables
 */
export function createTeamworkClient(): TeamworkClient {
  const apiKey = process.env.TEAMWORK_API_KEY;
  const subdomain = process.env.TEAMWORK_SUBDOMAIN;

  if (!apiKey) {
    throw new Error('TEAMWORK_API_KEY environment variable is required');
  }

  if (!subdomain) {
    throw new Error('TEAMWORK_SUBDOMAIN environment variable is required');
  }

  return new TeamworkClient({
    apiKey,
    subdomain,
  });
}
