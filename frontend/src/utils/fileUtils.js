/**
 * Utility functions for file operations
 */

/**
 * Download text content as a file
 * @param {string} content - The text content to download
 * @param {string} fileName - The name of the file to download
 * @param {string} fileType - The MIME type of the file (default: 'text/plain')
 * @param {string} fileExtension - The file extension (default: 'txt')
 */
export const downloadTextAsFile = (
  content, 
  fileName = 'report', 
  fileType = 'text/plain', 
  fileExtension = 'txt'
) => {
  // Create a blob with the content
  const blob = new Blob([content], { type: fileType });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.${fileExtension}`;
  
  // Append the link to the document
  document.body.appendChild(link);
  
  // Trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate a default filename based on the current date and time
 * @param {string} prefix - Prefix for the filename (default: 'radiology_report')
 * @returns {string} A filename with the current date and time
 */
export const generateDefaultFilename = (prefix = 'radiology_report') => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${prefix}_${year}${month}${day}_${hours}${minutes}`;
};

/**
 * Convert markdown content to HTML
 * @param {string} markdown - The markdown content to convert
 * @returns {string} The HTML content
 */
export const markdownToHtml = (markdown) => {
  // This is a very simple implementation
  // For a real application, use a proper markdown library
  
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Lists
    .replace(/^\s*\n\*/gm, '<ul>\n*')
    .replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2')
    .replace(/^\*(.+)/gm, '<li>$1</li>')
    
    // Paragraphs
    .replace(/^\s*\n\s*\n/gm, '</p><p>')
    
    // Line breaks
    .replace(/\n/gm, '<br>');
  
  // Wrap with paragraph tags
  html = '<p>' + html + '</p>';
  
  return html;
};
