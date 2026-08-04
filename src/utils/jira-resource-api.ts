import { AtlassianConfig, logger, createBasicHeaders } from './atlassian-api-base.js';
import { normalizeAtlassianBaseUrl } from './atlassian-api-base.js';

// Get list of Jira dashboards (all)
export async function getDashboards(config: AtlassianConfig, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/dashboard?startAt=${startAt}&maxResults=${maxResults}`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get list of Jira dashboards owned by current user (my dashboards)
export async function getMyDashboards(config: AtlassianConfig, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  // Atlassian API: filter=my
  const url = `${baseUrl}/rest/api/3/dashboard/search?filter=my&startAt=${startAt}&maxResults=${maxResults}`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get Jira dashboard by ID
export async function getDashboardById(config: AtlassianConfig, dashboardId: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/dashboard/${dashboardId}`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get gadgets (widgets) of a Jira dashboard
export async function getDashboardGadgets(config: AtlassianConfig, dashboardId: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/dashboard/${dashboardId}/gadget`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  return data.gadgets || [];
}

// Get Jira issue by key or id
export async function getIssue(config: AtlassianConfig, issueIdOrKey: string): Promise<any> {
  try {
    const headers = createBasicHeaders(config.email, config.apiToken);
    let baseUrl = config.baseUrl;
    if (baseUrl.startsWith("http://")) {
      baseUrl = baseUrl.replace("http://", "https://");
    } else if (!baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.includes(".atlassian.net")) {
      baseUrl = `${baseUrl}.atlassian.net`;
    }
    if (baseUrl.match(/\.atlassian\.net\.atlassian\.net/)) {
      baseUrl = baseUrl.replace(
        ".atlassian.net.atlassian.net",
        ".atlassian.net"
      );
    }
    const url = `${baseUrl}/rest/api/3/issue/${issueIdOrKey}?expand=renderedFields,names,schema,operations`;
    logger.debug(`Getting issue with direct fetch: ${url}`);
    logger.debug(`With Auth: ${config.email}:*****`);
    const curlCmd = `curl -X GET -H "Content-Type: application/json" -H "Accept: application/json" -H "User-Agent: MCP-Atlassian-Server/1.0.0" -u "${
      config.email
    }:${config.apiToken.substring(0, 5)}..." "${url}"`;
    logger.info(`Debug with curl: ${curlCmd}`);
    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
    });
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error (${statusCode}): ${responseText}`);
    }
    const issue = await response.json();
    return issue;
  } catch (error: any) {
    logger.error(`Error getting issue ${issueIdOrKey}:`, error);
    throw error;
  }
}

// Search issues by JQL
export async function searchIssues(config: AtlassianConfig, jql: string, maxResults: number = 50): Promise<any> {
  try {
    const headers = createBasicHeaders(config.email, config.apiToken);
    let baseUrl = config.baseUrl;
    if (baseUrl.startsWith("http://")) {
      baseUrl = baseUrl.replace("http://", "https://");
    } else if (!baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.includes(".atlassian.net")) {
      baseUrl = `${baseUrl}.atlassian.net`;
    }
    if (baseUrl.match(/\.atlassian\.net\.atlassian\.net/)) {
      baseUrl = baseUrl.replace(
        ".atlassian.net.atlassian.net",
        ".atlassian.net"
      );
    }
    const url = `${baseUrl}/rest/api/3/search/jql`;
    logger.debug(`Searching issues with JQL: ${jql}`);
    logger.debug(`With Auth: ${config.email}:*****`);
    const data = {
      jql: jql || "project is not empty order by created DESC",
      maxResults,
      expand: "names,schema,operations",
    };
    const curlCmd = `curl -X POST -H "Content-Type: application/json" -H "Accept: application/json" -H "User-Agent: MCP-Atlassian-Server/1.0.0" -u "${
      config.email
    }:${config.apiToken.substring(0, 5)}..." "${url}" -d '${JSON.stringify(
      data
    )}'`;
    logger.info(`Debug with curl: ${curlCmd}`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      credentials: "omit",
    });
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error (${statusCode}): ${responseText}`);
    }
    const searchResults = await response.json();
    return searchResults;
  } catch (error: any) {
    logger.error(`Error searching issues:`, error);
    throw error;
  }
}

// Get list of Jira filters
export async function getFilters(config: AtlassianConfig, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/filter/search?startAt=${startAt}&maxResults=${maxResults}`;
  logger.debug(`GET Jira filters: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get Jira filter by ID
export async function getFilterById(config: AtlassianConfig, filterId: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/filter/${filterId}`;
  logger.debug(`GET Jira filter by ID: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get filters owned by or shared with the current user
export async function getMyFilters(config: AtlassianConfig): Promise<any[]> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/filter/my`;
  logger.debug(`GET Jira my filters: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get list of Jira boards (Agile)
export async function getBoards(config: AtlassianConfig, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`;
  logger.debug(`GET Jira boards: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get Jira board by ID (Agile)
export async function getBoardById(config: AtlassianConfig, boardId: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/board/${boardId}`;
  logger.debug(`GET Jira board by ID: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get issues in a Jira board (Agile)
export async function getBoardIssues(config: AtlassianConfig, boardId: string, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/board/${boardId}/issue?startAt=${startAt}&maxResults=${maxResults}`;
  logger.debug(`GET Jira board issues: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get list of sprints in a Jira board (Agile)
export async function getSprintsByBoard(config: AtlassianConfig, boardId: string, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?startAt=${startAt}&maxResults=${maxResults}`;
  logger.debug(`GET Jira sprints by board: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get Jira sprint by ID (Agile)
export async function getSprintById(config: AtlassianConfig, sprintId: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/sprint/${sprintId}`;
  logger.debug(`GET Jira sprint by ID: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get issues in a Jira sprint (Agile)
export async function getSprintIssues(config: AtlassianConfig, sprintId: string, startAt = 0, maxResults = 50): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  let baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${maxResults}`;
  logger.debug(`GET Jira sprint issues: ${url}`);
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get list of Jira projects (API v3)
export async function getProjects(config: AtlassianConfig): Promise<any[]> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  const baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/project`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
}

// Get Jira project details (API v3)
export async function getProject(config: AtlassianConfig, projectKey: string): Promise<any> {
  const headers = createBasicHeaders(config.email, config.apiToken);
  const baseUrl = normalizeAtlassianBaseUrl(config.baseUrl);
  const url = `${baseUrl}/rest/api/3/project/${projectKey}`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
  if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
  return await response.json();
} 