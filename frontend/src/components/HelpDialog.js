import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const HelpDialog = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="help-dialog-title"
    >
      <DialogTitle id="help-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h6">How to Use the Radiology Transcription Assistant</Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Getting Started
        </Typography>
        
        <Typography paragraph>
          This application helps radiologists create structured reports by transcribing speech and processing it with AI.
          Follow these steps to create your report:
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <MicIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="1. Start Recording" 
              secondary="Click the 'Start Recording' button and speak clearly into your microphone. The application will transcribe your speech in real-time."
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <StopIcon color="secondary" />
            </ListItemIcon>
            <ListItemText 
              primary="2. Stop Recording" 
              secondary="When you're finished speaking, click 'Stop Recording'. You can review the transcribed text in the 'Raw Transcription' box."
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="3. Select a Template" 
              secondary="Choose an appropriate template from the dropdown menu to structure your report. Templates help organize the information in a standardized format."
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText 
              primary="4. Process with Gemini" 
              secondary="Click 'Process with Gemini' to have the AI refine and structure your transcription according to the selected template."
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <SaveIcon />
            </ListItemIcon>
            <ListItemText 
              primary="5. Save or Copy" 
              secondary="Review the processed report and make any necessary edits. You can copy it to the clipboard or save it for later use."
            />
          </ListItem>
        </List>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Tips for Best Results
        </Typography>
        
        <List>
          <ListItem>
            <ListItemText 
              primary="Speak clearly and at a moderate pace" 
              secondary="This improves transcription accuracy. Avoid speaking too quickly or mumbling."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Use medical terminology consistently" 
              secondary="The AI will better recognize specialized terms if you pronounce them clearly and consistently."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Structure your dictation" 
              secondary="Try to follow a logical structure in your dictation, similar to the template you'll be using."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Review and edit" 
              secondary="Always review the processed report for accuracy before finalizing it."
            />
          </ListItem>
        </List>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Troubleshooting
        </Typography>
        
        <List>
          <ListItem>
            <ListItemText 
              primary="Connection issues" 
              secondary="If you see a 'Disconnected from server' message, wait for automatic reconnection or refresh the page."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Microphone access" 
              secondary="If the app cannot access your microphone, check your browser permissions and make sure you've allowed microphone access."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Transcription errors" 
              secondary="If the transcription contains many errors, try speaking more clearly or adjusting your microphone position."
            />
          </ListItem>
        </List>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>Note:</strong> This application works best in modern browsers like Chrome, Firefox, or Edge.
            Some features may not work properly in older browsers or on mobile devices.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
