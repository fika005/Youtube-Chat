import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');
  const [loading, setLoading] = useState(false);

  const extractVideoId = (url) => {
    let videoId = '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        const params = new URLSearchParams(urlObj.search);
        videoId = params.get('v');
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      }
    } catch (error) {
      console.error('Invalid URL format', error);
    }
    return videoId;
  };

  const fetchTranscript = async (url) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/extractTranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (data.transcript) {
        return data.transcript;
      } else {
        throw new Error('Transcript not found');
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return '';
    }
  };

  const handleSubmitVideoUrl = async () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      try {
        const transcript = await fetchTranscript(videoUrl);
        setVideoTranscript(transcript);
        setIsChatOpen(true);
      } catch (error) {
        alert('Failed to fetch transcript. Please try again.');
      }
    } else {
      alert('Please enter a valid YouTube URL');
    }
  };

  const handleSendMessage = async () => {
    if (userMessage.trim() && videoTranscript) {
      const updatedMessages = [...messages, { text: userMessage, sender: 'user' }];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const response = await fetch('http://127.0.0.1:5000/answerQuestion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            history: updatedMessages,
            transcript: videoTranscript,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data);

        setMessages((prevMessages) => [...prevMessages, { text: data.reply, sender: 'bot' }]);
      } catch (error) {
        console.error('Error sending message to backend:', error);
        setMessages((prevMessages) => [...prevMessages, { text: 'Error sending message.', sender: 'bot' }]);
      } finally {
        setLoading(false);
      }

      setUserMessage('');
    } else {
      console.warn('Message or transcript is missing');
    }
  };

  const handleVideoUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmitVideoUrl();
    }
  };

  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="App">
      {!isChatOpen ? (
        <div className="video-input-container">
          <h2>Enter YouTube Video Link</h2>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyPress={handleVideoUrlKeyPress}
            placeholder="Paste YouTube video link here"
          />
          <button onClick={handleSubmitVideoUrl}>Submit</button>
        </div>
      ) : (
        <div className="content-container">
          <div className="video-container">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${extractVideoId(videoUrl)}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <div className="chat-container">
            <div className="chat-box">
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`message ${message.sender}`}>
                    {message.text}
                  </div>
                ))}
                {loading && (
                  <div className="loading-spinner">
                    <div className="spinner"></div> 
                  </div>
                )}
              </div>
              <div className="message-input">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={handleMessageKeyPress}
                  placeholder="Ask a question about the video"
                  disabled={loading}  
                />
                <button onClick={handleSendMessage} disabled={loading}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
