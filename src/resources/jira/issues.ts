import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../utils/logger.js';
import { getIssue as getIssueApi, searchIssues as searchIssuesApi } from '../../utils/jira-resource-api.js';
import { issueSchema, issuesListSchema, transitionsListSchema, commentsListSchema } from '../../schemas/jira.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';

const logger = Logger.getLogger('JiraResource:Issues');

/**
 * Helper function to get issue details from Jira
 */
async function getIssue(config: any, issueKey: string): Promise<any> {
  return await getIssueApi(config, issueKey);
}

/**
 * Helper function to get a list of issues from Jira (supports pagination)
 */
async function getIssues(config: any, startAt = 0, maxResults = 20, jql = ''): Promise<any> {
  const jqlQuery = jql && jql.trim() ? jql.trim() : '';
  return await searchIssuesApi(config, jqlQuery, maxResults);
}

/**
 * Helper function to search issues by JQL from Jira (supports pagination)
 */
async function searchIssuesByJql(config: any, jql: string, startAt = 0, maxResults = 20): Promise<any> {
  return await searchIssuesApi(config, jql, maxResults);
}

/**
 * Helper function to get a list of transitions for an issue from Jira
 */
async function getIssueTransitions(config: any, issueKey: string): Promise<any> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;
    logger.debug(`Getting Jira issue transitions: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    const data = await response.json();
    return data.transitions || [];
  } catch (error) {
    logger.error(`Error getting Jira issue transitions:`, error);
    throw error;
  }
}

/**
 * Helper function to get a list of comments for an issue from Jira
 */
async function getIssueComments(config: any, issueKey: string, startAt = 0, maxResults = 20): Promise<any> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    const url = `${baseUrl}/rest/api/3/issue/${issueKey}/comment?startAt=${startAt}&maxResults=${maxResults}`;
    logger.debug(`Getting Jira issue comments: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error getting Jira issue comments:`, error);
    throw error;
  }
}

/**
 * Hàm chuyển ADF sang text thuần
 */
function extractTextFromADF(adf: any): string {
  if (!adf || typeof adf === 'string') return adf || '';
  let text = '';
  if (adf.content) {
    adf.content.forEach((node: any) => {
      if (node.type === 'paragraph' && node.content) {
        node.content.forEach((inline: any) => {
          if (inline.type === 'text') {
            text += inline.text;
          }
        });
        text += '\n';
      }
    });
  }
  return text.trim();
}

/**
 * Format Jira issue data to standardized format
 */
function formatIssueData(issue: any, baseUrl: string): any {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields?.summary || '',
    description: extractTextFromADF(issue.fields?.description),
    rawDescription: issue.fields?.description || null,
    status: {
      name: issue.fields?.status?.name || 'Unknown',
      id: issue.fields?.status?.id || '0'
    },
    assignee: issue.fields?.assignee ? {
      displayName: issue.fields.assignee.displayName,
      accountId: issue.fields.assignee.accountId
    } : null,
    reporter: issue.fields?.reporter ? {
      displayName: issue.fields.reporter.displayName,
      accountId: issue.fields.reporter.accountId
    } : null,
    priority: issue.fields?.priority ? {
      name: issue.fields.priority.name,
      id: issue.fields.priority.id
    } : null,
    labels: issue.fields?.labels || [],
    created: issue.fields?.created || null,
    updated: issue.fields?.updated || null,
    issueType: {
      name: issue.fields?.issuetype?.name || 'Unknown',
      id: issue.fields?.issuetype?.id || '0'
    },
    projectKey: issue.fields?.project?.key || '',
    projectName: issue.fields?.project?.name || '',
    url: `${baseUrl}/browse/${issue.key}`
  };
}

/**
 * Format Jira comment data to standardized format
 */
function formatCommentData(comment: any): any {
  return {
    id: comment.id,
    body: extractTextFromADF(comment.body),
    rawBody: comment.body || '',
    author: comment.author ? {
      displayName: comment.author.displayName,
      accountId: comment.author.accountId
    } : null,
    created: comment.created || null,
    updated: comment.updated || null
  };
}

/**
 * Register resources related to Jira issues
 * @param server MCP Server instance
 */
export function registerIssueResources(server: McpServer) {
  logger.info('Registering Jira issue resources...');

  // Resource: Issues list (with pagination and JQL support)
  server.resource(
    'jira-issues-list',
    new ResourceTemplate('jira://issues', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://issues',
              name: 'Jira Issues',
              description: 'List and search all Jira issues',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, _extra) => {
      try {
        const config = Config.getAtlassianConfigFromEnv();
        const { limit, offset } = Resources.extractPagingParams(params);
        const jql = params.jql ? Array.isArray(params.jql) ? params.jql[0] : params.jql : '';
        const project = params.project ? Array.isArray(params.project) ? params.project[0] : params.project : '';
        const status = params.status ? Array.isArray(params.status) ? params.status[0] : params.status : '';
        
        // Build JQL query based on parameters
        let jqlQuery = jql;
        if (project && !jqlQuery.includes('project=')) {
          jqlQuery = jqlQuery ? `${jqlQuery} AND project = ${project}` : `project = ${project}`;
        }
        if (status && !jqlQuery.includes('status=')) {
          jqlQuery = jqlQuery ? `${jqlQuery} AND status = "${status}"` : `status = "${status}"`;
        }
        
        logger.info(`Searching Jira issues with JQL: ${jqlQuery || 'All issues'}`);
        const response = await searchIssuesApi(config, jqlQuery, limit);
        
        // Format issues data
        const formattedIssues = response.issues.map((issue: any) => formatIssueData(issue, config.baseUrl));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedIssues,
          'issues',
          issuesListSchema,
          response.total || response.issues?.length || 0,
          limit,
          offset,
          `${config.baseUrl}/issues/?jql=${encodeURIComponent(jqlQuery)}`
        );
      } catch (error) {
        logger.error('Error getting Jira issues:', error);
        throw error;
      }
    }
  );

  // Resource: Issue details
  server.resource(
    'jira-issue-details',
    new ResourceTemplate('jira://issues/{issueKey}', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://issues/{issueKey}',
              name: 'Jira Issue Details',
              description: 'Get details for a specific Jira issue by key. Replace {issueKey} with the issue key.',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, _extra) => {
      try {
        const config = Config.getAtlassianConfigFromEnv();
        let normalizedIssueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        if (!normalizedIssueKey) {
          throw new Error('Missing issueKey in URI');
        }
        
        logger.info(`Getting details for Jira issue: ${normalizedIssueKey}`);
        const issue = await getIssue(config, normalizedIssueKey);
        const formattedIssue = formatIssueData(issue, config.baseUrl);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          [formattedIssue],
          'issue',
          issueSchema,
          1,
          1,
          0,
          `${config.baseUrl}/browse/${normalizedIssueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue details:`, error);
        throw error;
      }
    }
  );

  // Resource: Issue transitions (available actions/status changes)
  server.resource(
    'jira-issue-transitions',
    new ResourceTemplate('jira://issues/{issueKey}/transitions', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://issues/{issueKey}/transitions',
              name: 'Jira Issue Transitions',
              description: 'List available transitions for a Jira issue. Replace {issueKey} with the issue key.',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, _extra) => {
      try {
        const config = Config.getAtlassianConfigFromEnv();
        let normalizedIssueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        if (!normalizedIssueKey) {
          throw new Error('Missing issueKey in URI');
        }
        
        logger.info(`Getting transitions for Jira issue: ${normalizedIssueKey}`);
        const transitions = await getIssueTransitions(config, normalizedIssueKey);
        
        // Format transitions data
        const formattedTransitions = transitions.map((t: any) => ({
          id: t.id,
          name: t.name,
          to: {
            id: t.to.id,
            name: t.to.name
          }
        }));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedTransitions,
          'transitions',
          transitionsListSchema,
          formattedTransitions.length,
          formattedTransitions.length,
          0,
          `${config.baseUrl}/browse/${normalizedIssueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue transitions:`, error);
        throw error;
      }
    }
  );

  // Resource: Issue comments
  server.resource(
    'jira-issue-comments',
    new ResourceTemplate('jira://issues/{issueKey}/comments', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://issues/{issueKey}/comments',
              name: 'Jira Issue Comments',
              description: 'List comments for a Jira issue. Replace {issueKey} with the issue key.',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, _extra) => {
      try {
        const config = Config.getAtlassianConfigFromEnv();
        let normalizedIssueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        if (!normalizedIssueKey) {
          throw new Error('Missing issueKey in URI');
        }
        
        const { limit, offset } = Resources.extractPagingParams(params);
        logger.info(`Getting comments for Jira issue: ${normalizedIssueKey}`);
        const commentData = await getIssueComments(config, normalizedIssueKey, offset, limit);
        
        // Format comments data
        const formattedComments = (commentData.comments || []).map((c: any) => formatCommentData(c));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedComments,
          'comments',
          commentsListSchema,
          commentData.total || formattedComments.length,
          limit,
          offset,
          `${config.baseUrl}/browse/${normalizedIssueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue comments:`, error);
        throw error;
      }
    }
  );

  logger.info('Jira issue resources registered successfully');
}
