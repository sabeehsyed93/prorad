import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
// Format date to a readable string
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

const TranscriptionHistory = ({ 
  history, 
  onDelete, 
  onRestore, 
  onClearAll 
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState(null);

  const handleDeleteClick = (entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEntry) {
      onDelete(selectedEntry.id);
    }
    setDeleteDialogOpen(false);
    setSelectedEntry(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Previous Transcriptions</Typography>
        {history.length > 0 && (
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            onClick={() => onClearAll()}
          >
            Clear All
          </Button>
        )}
      </Box>

      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No previous transcriptions found
        </Typography>
      ) : (
        <List>
          {history.map((entry) => (
            <Paper 
              key={entry.id} 
              elevation={1} 
              sx={{ mb: 1 }}
            >
              <ListItem
                sx={{
                  pr: 12,
                  '& .MuiListItemText-secondary': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">Created: {formatDate(entry.timestamp)}</Typography>
                      {entry.lastModified && entry.lastModified !== entry.timestamp && (
                        <Typography variant="body2" color="text.secondary">
                          Modified: {formatDate(entry.lastModified)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={entry.text}
                />
                <Box sx={{ position: 'absolute', right: 8, display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => onRestore(entry.text)}
                    title="Restore this transcription"
                  >
                    <RestoreIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(entry)}
                    title="Delete this transcription"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Transcription?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this transcription? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TranscriptionHistory;
