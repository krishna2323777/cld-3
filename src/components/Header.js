import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import './Header.css';
import logo from '../assests/logo.png';

const Header = ({ userEmail }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [isVoiceLoaded, setIsVoiceLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoiceLoading, setIsVoiceLoading] = useState(true);
  const chatIframeRef = useRef(null);
  const voiceIframeRef = useRef(null);

  useEffect(() => {
    // Preload the chat iframe after login
    if (userEmail && !isChatLoaded) {
      const iframe = document.createElement('iframe');
      iframe.src = "https://app.relevanceai.com/agents/f1db6c/40f9760672f4-47b5-89f9-e3cdb99d658d/3c8b5767-e8d6-44d9-a08a-d4b3c4993330/embed-chat?hide_tool_steps=true&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%2300002B&bubble_icon=pd%2Fchat&input_placeholder_text=Say+Hii+Here....&hide_logo=true";
      iframe.style.display = 'none';
      
      iframe.onload = () => {
        setIsChatLoaded(true);
        setIsLoading(false);
      };

      iframe.onerror = () => {
        console.error('Failed to load chat iframe');
        setIsLoading(false);
      };

      document.body.appendChild(iframe);
    }

    // Preload the voice assistant iframe after login
    if (userEmail && !isVoiceLoaded) {
      const iframe = document.createElement('iframe');
      iframe.src = "https://ankithapaladugu.github.io/contactform2/";
      iframe.style.display = 'none';
      
      iframe.onload = () => {
        setIsVoiceLoaded(true);
        setIsVoiceLoading(false);
      };

      iframe.onerror = () => {
        console.error('Failed to load voice assistant iframe');
        setIsVoiceLoading(false);
      };

      document.body.appendChild(iframe);
    }
  }, [userEmail, isChatLoaded, isVoiceLoaded]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const toggleSupportChat = () => {
    if (!showSupportChat && !isChatLoaded) {
      setIsLoading(true);
    }
    setShowSupportChat(!showSupportChat);
  };

  const toggleVoiceAssistant = () => {
    if (!showVoiceAssistant && !isVoiceLoaded) {
      setIsVoiceLoading(true);
    }
    setShowVoiceAssistant(!showVoiceAssistant);
  };

  return (
    <header className="app-header">
      <div className="header-logo">
        <img src={logo} alt="Company Logo" />
      </div>
      
      {/* Header spacer to replace search bar and maintain layout */}
      <div className="header-spacer"></div>
      
      <div className="header-actions">
        {/* Voice Assistant with improved icon */}
        <div className="voice-assistant">
          <button 
            className="icon-button" 
            title="Voice Assistant"
            onClick={toggleVoiceAssistant}
          >
            <span className="assistant-icon">🎙️</span>
          </button>
          {showVoiceAssistant && (
            <div className="support-chat-popup voice-popup">
              <div className="support-chat-header">
                <span>Voice Assistant</span>
                <button className="close-chat" onClick={toggleVoiceAssistant}>×</button>
              </div>
              <div className="support-chat-content">
                {isVoiceLoading && (
                  <div className="chat-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading voice assistant...</span>
                  </div>
                )}
                <iframe
                  ref={voiceIframeRef}
                  src="https://ankithapaladugu.github.io/contactform2/"
                  title="Voice Assistant"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: isVoiceLoading ? 'none' : 'block' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Client Support with bot image */}
        <div className="client-support">
          <button 
            className="icon-button" 
            title="Client Support" 
            onClick={toggleSupportChat}
          >
            <span className="support-icon">🤖</span>
          </button>
          {showSupportChat && (
            <div className="support-chat-popup">
              <div className="support-chat-header">
                <span>Client Support</span>
                <button className="close-chat" onClick={toggleSupportChat}>×</button>
              </div>
              <div className="support-chat-content">
                {isLoading && (
                  <div className="chat-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading chat...</span>
                  </div>
                )}
                <iframe
                  ref={chatIframeRef}
                  src="https://app.relevanceai.com/agents/f1db6c/40f9760672f4-47b5-89f9-e3cdb99d658d/3c8b5767-e8d6-44d9-a08a-d4b3c4993330/embed-chat?hide_tool_steps=true&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%2300002B&bubble_icon=pd%2Fchat&input_placeholder_text=Say+Hii+Here....&hide_logo=true"
                  title="Client Support Chat"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: isLoading ? 'none' : 'block' }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Notifications - empty but kept for layout consistency */}
        <div className="notifications">
          <button 
            className="icon-button" 
            title="Notifications"
          >
            🔔
          </button>
        </div>
        
        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" onClick={toggleUserMenu}>
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
          
          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="user-info">
                <div className="user-avatar-large">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <span className="user-name">{userEmail || 'User'}</span>
                  <span className="user-role">Client</span>
                </div>
              </div>
              
              <ul className="user-menu-list">
                
                <li onClick={() => navigate('/settings')}>
                  <span className="menu-icon">⚙️</span>
                  <span>Settings</span>
                </li>
                <li onClick={handleLogout}>
                  <span className="menu-icon">🚪</span>
                  <span>Logout</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;