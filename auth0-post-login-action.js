/**
 * Auth0 Post-Login Action: Automatic User Profile Enrichment
 * 
 * This action checks if user data has been synced from an external database,
 * and if not, fetches user metadata from an external API and updates the
 * Auth0 user profile with the retrieved information.
 */

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  const { user } = event;
  
  try {
    // Step 1: Check if user data has already been synced
    const isDataSynced = user.app_metadata?.is_data_synced;
    
    if (isDataSynced) {
      console.log(`User ${user.user_id} data already synced, skipping enrichment`);
      return;
    }
    
    console.log(`Starting data enrichment for user ${user.user_id}`);
    
    // Step 2: Make asynchronous call to external API
    const externalApiUrl = `https://api.internal-db.com/user-data?id=${user.user_id}`;
    
    const response = await api.fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any required authentication headers here
        // 'Authorization': `Bearer ${event.secrets.EXTERNAL_API_TOKEN}`,
        // 'X-API-Key': event.secrets.EXTERNAL_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`External API request failed with status: ${response.status}`);
    }
    
    const userData = await response.json();
    console.log(`Successfully fetched user data for ${user.user_id}`);
    
    // Step 3: Update Auth0 user's app_metadata with fetched data
    const updatedAppMetadata = {
      ...user.app_metadata,
      // Add the fetched user data
      loyalty_tier: userData.loyalty_tier || 'Bronze', // Default to Bronze if not provided
      employee_id: userData.employee_id,
      department: userData.department,
      access_level: userData.access_level,
      custom_permissions: userData.custom_permissions || [],
      // Mark data as synced
      is_data_synced: true,
      data_sync_timestamp: new Date().toISOString()
    };
    
    // Update the user's app_metadata
    api.user.setAppMetadata("loyalty_tier", updatedAppMetadata.loyalty_tier);
    api.user.setAppMetadata("employee_id", updatedAppMetadata.employee_id);
    api.user.setAppMetadata("department", updatedAppMetadata.department);
    api.user.setAppMetadata("access_level", updatedAppMetadata.access_level);
    api.user.setAppMetadata("custom_permissions", updatedAppMetadata.custom_permissions);
    api.user.setAppMetadata("is_data_synced", true);
    api.user.setAppMetadata("data_sync_timestamp", updatedAppMetadata.data_sync_timestamp);
    
    console.log(`Successfully updated app_metadata for user ${user.user_id}`);
    
    // Optional: Add custom claims to the ID token for immediate use
    api.idToken.setCustomClaim("loyalty_tier", updatedAppMetadata.loyalty_tier);
    api.idToken.setCustomClaim("access_level", updatedAppMetadata.access_level);
    
    // Optional: Add custom claims to the access token
    api.accessToken.setCustomClaim("loyalty_tier", updatedAppMetadata.loyalty_tier);
    api.accessToken.setCustomClaim("access_level", updatedAppMetadata.access_level);
    
  } catch (error) {
    // Step 4: Handle errors gracefully - log error but allow login to proceed
    console.error(`Error during user profile enrichment for ${user.user_id}:`, error.message);
    
    // Optionally, you could set a flag indicating the sync failed
    api.user.setAppMetadata("data_sync_error", {
      message: error.message,
      timestamp: new Date().toISOString(),
      retry_count: (user.app_metadata?.data_sync_error?.retry_count || 0) + 1
    });
    
    // Allow login to proceed despite the error
    console.log(`Login proceeding for user ${user.user_id} despite enrichment failure`);
  }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect.
 * If your onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onContinuePostLogin = async (event, api) => {
  // This function is called when resuming after a redirect
  // Not needed for this particular use case
};