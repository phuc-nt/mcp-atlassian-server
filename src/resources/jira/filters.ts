/**
 * Jira Filter Resources
 * 
 * These resources provide access to Jira filters through MCP.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { filterListSchema, filterSchema } from '../../schemas/jira.js';
import { createStandardMetadata } from '../../schemas/common.js';
import { getFilters, getFilterById, getMyFilters } from '../../utils/jira-resource-api.js';
import { Logger } from '../../utils/logger.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';

const logger = Logger.getLogger('JiraFilterResources');

/**
 * Register all Jira filter resources with MCP Server
 * @param server MCP Server instance
 */
export function registerFilterResources(server: McpServer) {
  logger.info('Registering Jira filter resources...');
  
  // Chỉ đăng ký mỗi template một lần kèm handler
  
  // Resource: Filter list
  const filtersTemplate = new ResourceTemplate('jira://filters', {
    list: async (_extra) => ({
      resources: [
        {
          uri: 'jira://filters',
          name: 'Jira Filters',
          description: 'List and search all Jira filters',
          mimeType: 'application/json'
        }
      ]
    })
  });
  
  // Resource: Filter details
  const filterDetailsTemplate = new ResourceTemplate('jira://filters/{filterId}', {
    list: async (_extra) => ({
      resources: [
        {
          uri: 'jira://filters/{filterId}',
          name: 'Jira Filter Details',
          description: 'Get details for a specific Jira filter by ID. Replace {filterId} with the filter ID.',
          mimeType: 'application/json'
        }
      ]
    })
  });
  
  // Resource: My filters
  const myFiltersTemplate = new ResourceTemplate('jira://filters/my', {
    list: async (_extra) => ({
      resources: [
        {
          uri: 'jira://filters/my',
          name: 'Jira My Filters',
          description: 'List filters owned by or shared with the current user.',
          mimeType: 'application/json'
        }
      ]
    })
  });
  
  // Đăng ký template kèm handler thực thi - chỉ đăng ký một lần mỗi URI
  server.resource('jira-filters-list', filtersTemplate, 
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from environment
        const config = Config.getAtlassianConfigFromEnv();
        
        const { limit, offset } = Resources.extractPagingParams(params);
        const response = await getFilters(config, offset, limit);
        return Resources.createStandardResource(
          typeof uri === 'string' ? uri : uri.href,
          response.values,
          'filters',
          filterListSchema,
          response.total || response.values.length,
          limit,
          offset,
          `${config.baseUrl}/secure/ManageFilters.jspa`
        );
      } catch (error) {
        logger.error('Error getting filter list:', error);
        throw error;
      }
    }
  );

  server.resource('jira-filter-details', filterDetailsTemplate, 
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from environment
        const config = Config.getAtlassianConfigFromEnv();
        
        const filterId = Array.isArray(params.filterId) ? params.filterId[0] : params.filterId;
        const filter = await getFilterById(config, filterId);
        return Resources.createStandardResource(
          typeof uri === 'string' ? uri : uri.href,
          [filter],
          'filter',
          filterSchema,
          1,
          1,
          0,
          `${config.baseUrl}/secure/ManageFilters.jspa?filterId=${filterId}`
        );
      } catch (error) {
        logger.error(`Error getting filter details for filter ${params.filterId}:`, error);
        throw error;
      }
    }
  );

  server.resource('jira-my-filters', myFiltersTemplate, 
    async (uri: string | URL, _params: Record<string, any>, _extra: any) => {
      try {
        // Get config from environment
        const config = Config.getAtlassianConfigFromEnv();
        
        const filters = await getMyFilters(config);
        return Resources.createStandardResource(
          typeof uri === 'string' ? uri : uri.href,
          filters,
          'filters',
          filterListSchema,
          filters.length,
          filters.length,
          0,
          `${config.baseUrl}/secure/ManageFilters.jspa?filterView=my`
        );
      } catch (error) {
        logger.error('Error getting my filters:', error);
        throw error;
      }
    }
  );
  
  logger.info('Jira filter resources registered successfully');
}