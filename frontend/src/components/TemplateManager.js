import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const TemplateManager = ({ templates, onTemplateAdd, onTemplateEdit, onTemplateDelete }) => {
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddTemplate = () => {
    if (newTemplate.name && newTemplate.content) {
      onTemplateAdd(newTemplate);
      setNewTemplate({ name: '', content: '' });
      setDialogOpen(false);
    }
  };

  const handleEditTemplate = () => {
    if (editingTemplate) {
      onTemplateEdit(editingTemplate);
      setEditingTemplate(null);
      setDialogOpen(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
    } else {
      setNewTemplate({ name: '', content: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setNewTemplate({ name: '', content: '' });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Report Templates</Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => handleOpenDialog()}
        >
          Add Template
        </Button>
      </Box>

      <List>
        {templates.map((template) => (
          <Paper elevation={1} sx={{ mb: 1 }} key={template.name}>
            <ListItem
              sx={{
                pr: 12, // Add padding on the right for icons
                '& .MuiListItemText-secondary': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }
              }}
            >
              <ListItemText
                primary={template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                secondary={template.content.length > 50 
                  ? template.content.substring(0, 50) + '...' 
                  : template.content}
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="edit"
                  onClick={() => handleOpenDialog(template)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => onTemplateDelete(template.name)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Add New Template'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={editingTemplate ? editingTemplate.name : newTemplate.name}
            onChange={(e) => editingTemplate 
              ? setEditingTemplate({ ...editingTemplate, name: e.target.value })
              : setNewTemplate({ ...newTemplate, name: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            label="Template Content"
            multiline
            rows={8}
            fullWidth
            value={editingTemplate ? editingTemplate.content : newTemplate.content}
            onChange={(e) => editingTemplate
              ? setEditingTemplate({ ...editingTemplate, content: e.target.value })
              : setNewTemplate({ ...newTemplate, content: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={editingTemplate ? handleEditTemplate : handleAddTemplate}
            variant="contained"
            color="primary"
          >
            {editingTemplate ? 'Save Changes' : 'Add Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateManager;
