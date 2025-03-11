import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Typography, Box, Paper } from '@mui/material';

const TemplateSelector = ({ templates, selectedTemplate, onTemplateChange }) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Report Template
      </Typography>
      
      <FormControl fullWidth>
        <InputLabel id="template-select-label">Select Template</InputLabel>
        <Select
          labelId="template-select-label"
          id="template-select"
          value={selectedTemplate}
          label="Select Template"
          onChange={(e) => onTemplateChange(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.name} value={template.name}>
              {template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedTemplate && templates.find(t => t.name === selectedTemplate) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Template Preview:
          </Typography>
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {templates.find(t => t.name === selectedTemplate).content}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TemplateSelector;
