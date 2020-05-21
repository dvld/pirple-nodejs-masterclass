/**
 * Create and export configuration variables
 * 
 */

// Environment container
const environments = {};

environments.staging = {
  'port': 3000,
  'envName': 'staging'
};

environments.production = {
  'port': 5000,
  'envName': 'production'
};

// Determine environment
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Ensure environment exists
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;