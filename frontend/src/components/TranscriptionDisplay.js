import React from 'react';
import { Box, Paper, Typography, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const TranscriptionDisplay = ({ title, text, onCopy }) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        {text && (
          <IconButton size="small" onClick={onCopy} aria-label="copy">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          p: 2,
          backgroundColor: '#f8f9fa',
          borderRadius: 1,
          minHeight: '100px',
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
          maxHeight: '300px',
          fontFamily: 'monospace',
        }}
      >
        {text || <Typography color="text.secondary" fontStyle="italic">No content available</Typography>}
      </Box>
    </Paper>
  );
};

export default TranscriptionDisplay;
