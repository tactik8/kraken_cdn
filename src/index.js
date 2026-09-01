

import { FormData } from 'node:buffer';

/**
 * Downloads a file from a URL and posts it to a target API endpoint as multipart/form-data.
 * 
 * @param {string} fileUrl - The public URL of the file to download.
 * @param {string} targetApiUrl - The API endpoint where the file should be sent.
 * @param {string} [fieldName='file'] - The form-data field name expected by the receiving API.
 * @returns {Promise<object>} The JSON response from the target API.
 */
async function transferFile(fileUrl, targetApiUrl, fieldName = 'file') {
    // 1. Fetch the file from the source URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    // 2. Extract the file blob and infer a filename from the URL path
    const fileBlob = await fileResponse.blob();
    const fileName = fileUrl.split('/').pop().split('?')[0] || 'file';

    // 3. Construct multipart form-data payload
    const formData = new FormData();
    formData.append(fieldName, fileBlob, fileName);

    // 4. Send the file to the target API
    const apiResponse = await fetch(targetApiUrl, {
        method: 'POST',
        body: formData,
    });

    if (!apiResponse.ok) {
        throw new Error(`API upload failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    return await apiResponse.json();
}

