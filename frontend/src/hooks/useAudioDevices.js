import { useState, useEffect } from 'react';

const useAudioDevices = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get list of audio input devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = allDevices.filter(device => device.kind === 'audioinput');
        
        setDevices(audioDevices);
        
        // Set default device if none selected
        if (!selectedDevice && audioDevices.length > 0) {
          setSelectedDevice(audioDevices[0].deviceId);
        }
      } catch (err) {
        setError('Failed to load audio devices: ' + err.message);
      }
    };

    loadDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [selectedDevice]);

  return {
    devices,
    selectedDevice,
    setSelectedDevice,
    error
  };
};

export default useAudioDevices;
