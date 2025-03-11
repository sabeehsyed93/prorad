import React, { useState, useEffect, useRef } from 'react';
import './components/RainbowGlow.css';
import './components/Logo.css';
import Logo from './components/Logo';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Grid,
  IconButton,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Fab,
  Drawer,
  CssBaseline
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import HelpDialog from './components/HelpDialog';
import TemplateManager from './components/TemplateManager';
import { downloadTextAsFile, generateDefaultFilename } from './utils/fileUtils';
import useAudioRecorder from './hooks/useAudioRecorder';
import useAudioDevices from './hooks/useAudioDevices';
import { saveTranscription, getTranscriptionHistory, deleteTranscription, clearTranscriptionHistory } from './utils/transcriptionUtils';
import TranscriptionHistory from './components/TranscriptionHistory';

// Create a dark theme
const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#121212',
          color: '#ffffff'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            '& fieldset': {
              borderColor: '#404040'
            },
            '&:hover fieldset': {
              borderColor: '#505050'
            }
          },
          '& .MuiOutlinedInput-input': {
            color: '#ffffff'
          },
          '& .MuiInputLabel-root': {
            color: '#b0b0b0'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          color: '#ffffff'
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#404040'
          }
        }
      }
    }
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',  // Lighter blue for dark theme
    },
    secondary: {
      main: '#f48fb1',  // Lighter pink for dark theme
    },
    background: {
      default: '#121212',  // Material UI's recommended dark background
      paper: '#1e1e1e',    // Slightly lighter than background for contrast
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
      color: '#ffffff',
    },
    body1: {
      color: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#2d2d2d',
            '& fieldset': {
              borderColor: '#404040',
            },
            '&:hover fieldset': {
              borderColor: '#505050',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
        },
      },
    },
  },
});

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [audioSupport, setAudioSupport] = useState({ isSupported: true, issues: [] });
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  
  // Load transcription history on mount
  useEffect(() => {
    setTranscriptionHistory(getTranscriptionHistory());
  }, []);
  
  const drawerWidth = 360;
  
  // Track the current transcription entry ID
  const [currentEntryId, setCurrentEntryId] = useState(null);

  // Initialize audio devices and recorder
  const { devices, selectedDevice, setSelectedDevice, error: deviceError } = useAudioDevices();
  const {
    transcription: speechTranscription,
    error: speechError,
    startRecording: startSpeechRecording,
    stopRecording: stopSpeechRecording,
  } = useAudioRecorder(selectedDevice);

  // Create new entry on page load
  useEffect(() => {
    const newEntry = saveTranscription('');
    setCurrentEntryId(newEntry.id);
  }, []);

  // Create new entry when transcription is cleared
  useEffect(() => {
    if (!transcription.trim()) {
      const newEntry = saveTranscription('');
      setCurrentEntryId(newEntry.id);
      setTranscriptionHistory(getTranscriptionHistory());
    }
  }, [transcription]);

  // Load templates when component mounts
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Check audio support and sync transcription
  useEffect(() => {
    // Check Web Speech API support
    if (!('webkitSpeechRecognition' in window)) {
      setAudioSupport({
        isSupported: false,
        issues: ['Your browser does not support speech recognition. Please use Chrome or Edge.']
      });
      showNotification(
        'Your browser does not support speech recognition. Please use Chrome or Edge.',
        'warning',
        10000
      );
      return;
    }

    // Update transcription when speech recognition provides new text
    if (speechTranscription) {
      setTranscription(speechTranscription);
    }

    // Handle speech recognition errors
    if (speechError) {
      showNotification(speechError, 'error');
    }
  }, [speechTranscription, speechError]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/templates');
      const data = await response.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showNotification('Failed to fetch templates', 'error');
    }
  };

  const [cursorPosition, setCursorPosition] = useState(null);
  const textFieldRef = useRef(null);

  const handleTextFieldClick = (event) => {
    setCursorPosition(event.target.selectionStart);
  };

  const handleTextFieldKeyUp = (event) => {
    setCursorPosition(event.target.selectionStart);
  };

  const handleStartRecording = async () => {
    try {
      // Get the latest cursor position
      const position = textFieldRef.current ? textFieldRef.current.selectionStart : transcription.length;
      const currentText = transcription;
      
      await startSpeechRecording(position, currentText);
      setIsRecording(true);
      showNotification('Recording started', 'info', 2000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      showNotification('Failed to start recording', 'error');
    }
  };

  // Pause/Resume functionality removed as Web Speech API doesn't support it

  const handleStopRecording = () => {
    stopSpeechRecording();
    setIsRecording(false);
    // Update current entry when recording stops
    if (transcription.trim() && currentEntryId) {
      const history = getTranscriptionHistory();
      const updatedHistory = history.map(entry => 
        entry.id === currentEntryId 
          ? { ...entry, text: transcription, lastModified: new Date().toISOString() }
          : entry
      );
      localStorage.setItem('transcription_history', JSON.stringify(updatedHistory));
      setTranscriptionHistory(updatedHistory);
    }
    showNotification('Recording stopped', 'info', 2000);
  };
  
  // Update current entry when text changes manually
  useEffect(() => {
    if (!isRecording && transcription.trim() && currentEntryId) {
      const history = getTranscriptionHistory();
      const updatedHistory = history.map(entry => 
        entry.id === currentEntryId 
          ? { ...entry, text: transcription, lastModified: new Date().toISOString() }
          : entry
      );
      localStorage.setItem('transcription_history', JSON.stringify(updatedHistory));
      setTranscriptionHistory(updatedHistory);
    }
  }, [transcription, isRecording, currentEntryId]);

  const handleProcessTranscription = async () => {
    if (!transcription.trim()) {
      showNotification('No transcription to process', 'warning');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcription,
          template_name: selectedTemplate || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Failed to process transcription';
        } catch (e) {
          console.error('Error parsing error response:', errorText);
          errorMessage = 'Server error: ' + (errorText.slice(0, 100) || 'Unknown error');
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.processed_text) {
        setProcessedText(data.processed_text);
        showNotification('Transcription processed successfully', 'success');
      } else if (data.error) {
        showNotification(data.error, 'error');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error processing transcription:', error);
      showNotification(error.message || 'Failed to process transcription', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showNotification('Copied to clipboard', 'success');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        showNotification('Failed to copy to clipboard', 'error');
      });
  };

  const handleSaveReport = () => {
    if (!processedText.trim()) {
      showNotification('No report to save', 'warning');
      return;
    }
    
    try {
      // Generate a filename based on the current date and time
      const filename = generateDefaultFilename();
      
      // Download the report as a text file
      downloadTextAsFile(processedText, filename);
      
      showNotification('Report saved successfully', 'success');
    } catch (error) {
      console.error('Error saving report:', error);
      showNotification('Failed to save report', 'error');
    }
  };

  const showNotification = (message, severity, duration = 6000) => {
    setNotification({
      open: true,
      message,
      severity,
      duration,
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleOpenHelpDialog = () => {
    setHelpDialogOpen(true);
  };

  const handleCloseHelpDialog = () => {
    setHelpDialogOpen(false);
  };

  const handleAddTemplate = async (template) => {
    try {
      const response = await fetch('/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add template');
      }
      
      await fetchTemplates();
      showNotification('Template added successfully', 'success');
    } catch (error) {
      console.error('Error adding template:', error);
      showNotification('Failed to add template', 'error');
    }
  };

  const handleEditTemplate = async (template) => {
    try {
      const response = await fetch(`/templates/${template.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      await fetchTemplates();
      showNotification('Template updated successfully', 'success');
    } catch (error) {
      console.error('Error updating template:', error);
      showNotification('Failed to update template', 'error');
    }
  };

  const handleDeleteTemplate = async (templateName) => {
    try {
      const response = await fetch(`/templates/${templateName}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      await fetchTemplates();
      showNotification('Template deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      showNotification('Failed to delete template', 'error');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Drawer */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          PaperProps={{
            sx: {
              width: drawerWidth,
              position: 'static',
              border: 'none',
            }
          }}
          sx={{
            width: drawerOpen ? drawerWidth : 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            '& .MuiDrawer-paper': {
              overflowX: 'hidden',
            },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2
          }}>
            <Typography variant="h6">Templates</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Divider />
          <TemplateManager 
            templates={templates}
            onTemplateAdd={handleAddTemplate}
            onTemplateEdit={handleEditTemplate}
            onTemplateDelete={handleDeleteTemplate}
          />
        </Drawer>

        {/* Main content */}
        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          margin: 0,
          overflow: 'hidden',
        }}>
          <Container 
            maxWidth="lg" 
            sx={{ 
              px: { xs: 3, sm: 4, md: 6 },
              py: 3,
              height: '100%',
            }}>
            <Box sx={{ my: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center', 
                mb: 2,
                gap: 2
              }}>
                <IconButton 
                  onClick={() => setDrawerOpen(true)} 
                  sx={{ display: drawerOpen ? 'none' : 'block' }}
                >
                  <MenuIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center' }} className="app-title">
                  <Logo height="40px" />
                  <Typography variant="h4" component="h1">
                    PRORAD
                  </Typography>
                </Box>
              </Box>
          {/* Recording Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 120, mr: 2 }}>
                <Select
                  value={selectedDevice || ''}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  disabled={isRecording}
                  size="small"
                  sx={{ bgcolor: 'background.paper' }}
                >
                  {devices.map((device) => (
                    <MenuItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${devices.indexOf(device) + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color={isRecording ? "error" : "primary"}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!audioSupport.isSupported || !selectedDevice}
                startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>

              <Tooltip title="Copy to clipboard">
                <span>
                  <IconButton
                    onClick={() => handleCopyToClipboard(transcription)}
                    disabled={!transcription}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Save as file">
                <span>
                  <IconButton
                    onClick={() => downloadTextAsFile(transcription, generateDefaultFilename())}
                    disabled={!transcription}
                  >
                    <SaveIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Help">
                <IconButton onClick={() => setHelpDialogOpen(true)}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Main Content */}
          <Grid container spacing={3}>
            {!audioSupport.isSupported && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">Browser not fully supported</Typography>
                  <Typography variant="body2">
                    {audioSupport.issues.join(' ')}
                  </Typography>
                </Alert>
              </Grid>
            )}
            
            {/* Transcription Display */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Raw Transcription</Typography>
                  <IconButton 
                    onClick={() => handleCopyToClipboard(transcription)}
                    disabled={!transcription.trim()}
                    size="small"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                <TextField
                  id="transcription-field"
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  value={transcription}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setTranscription(newText);
                    // Auto-save when manually editing, but don't create new entry
                    saveTranscription(newText, false);
                    setTranscriptionHistory(getTranscriptionHistory());
                  }}
                  onClick={handleTextFieldClick}
                  onKeyUp={handleTextFieldKeyUp}
                  inputRef={textFieldRef}
                  placeholder="Transcribed text will appear here..."
                  disabled={isRecording}
                />
                
                {/* Template Selection and Process Button */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="template-select-label">Select Template</InputLabel>
                    <Select
                      labelId="template-select-label"
                      id="template-select"
                      value={selectedTemplate}
                      label="Select Template"
                      onChange={(e) => setSelectedTemplate(e.target.value)}
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
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleProcessTranscription}
                    className={isProcessing ? 'rainbow-glow processing' : ''}
                    disabled={!transcription.trim()}
                    sx={{
                      height: 56,
                      position: 'relative',
                      overflow: 'visible',
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(0, 0, 0, 0.12)'
                      },
                      '&::before': isProcessing ? {
                        content: '""',
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: '5px',
                        background: 'transparent',
                        zIndex: -1
                      } : {}
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                        Processing...
                      </>
                    ) : (
                      'Process with Gemini'
                    )}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            {/* Processed Text Display */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Processed Report</Typography>
                  <Box>
                    <IconButton 
                      onClick={() => handleCopyToClipboard(processedText)}
                      disabled={!processedText.trim()}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      disabled={!processedText.trim()}
                      size="small"
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  variant="outlined"
                  value={processedText}
                  onChange={(e) => setProcessedText(e.target.value)}
                  placeholder="Processed report will appear here..."
                  className={isProcessing ? 'rainbow-glow-text processing' : ''}
                  sx={{
                    position: 'relative',
                    overflow: 'visible',
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#2d2d2d',
                      color: '#ffffff',
                      '& fieldset': {
                        borderColor: '#404040'
                      },
                      '&:hover fieldset': {
                        borderColor: '#505050'
                      }
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#ffffff'
                    },
                    '& .MuiInputLabel-root': {
                      color: '#b0b0b0'
                    },
                    '&::before': isProcessing ? {
                      content: '""',
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      borderRadius: '5px',
                      background: 'transparent',
                      zIndex: -1
                    } : {}
                  }}
                />
              </Paper>
            </Grid>

            {/* Transcription History */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <TranscriptionHistory
                  history={transcriptionHistory}
                  onDelete={(id) => {
                    const updatedHistory = deleteTranscription(id);
                    if (updatedHistory) {
                      setTranscriptionHistory(updatedHistory);
                      showNotification('Transcription deleted', 'success');
                    }
                  }}
                  onRestore={(text) => {
                    setTranscription(text);
                    showNotification('Transcription restored', 'success');
                  }}
                  onClearAll={() => {
                    if (clearTranscriptionHistory()) {
                      setTranscriptionHistory([]);
                      showNotification('History cleared', 'success');
                    }
                  }}
                />
              </Paper>
            </Grid>
          </Grid>

          <Snackbar 
            open={notification.open} 
            autoHideDuration={notification.duration} 
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
              {notification.message}
            </Alert>
          </Snackbar>

          {/* Help Button */}
          <Tooltip title="Help & Instructions">
            <Fab 
              color="primary" 
              size="medium" 
              aria-label="help"
              onClick={handleOpenHelpDialog}
              sx={{ position: 'fixed', bottom: 20, right: 20 }}
            >
              <HelpOutlineIcon />
            </Fab>
          </Tooltip>

          {/* Help Dialog */}
          <HelpDialog open={helpDialogOpen} onClose={handleCloseHelpDialog} />
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
