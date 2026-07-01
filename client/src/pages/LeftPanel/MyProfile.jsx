import React, { useState } from 'react'
import { User, MessageSquare, LogOut, Camera, ChevronRight, Check, X } from 'lucide-react'
import { logout } from '../../services/auth'
import { useAuth } from '../../store/auth'
import { useUIStore } from '../../store/uiStore'
import '../../styles/MyProfile.scss'

export default function MyProfile() {
  const { clearUser, user } = useAuth()
  const { setActiveChat, setLeftView, setRightView } = useUIStore()
  const [username, setUsername] = useState(user.email.split("@")[0])
  const [name, setName] = useState(user.name)
  const [about, setAbout] = useState('Hey there! I am using Nexus.')

  const [editingField, setEditingField] = useState(null)
  const [tempValue, setTempValue] = useState('')

  const handleLogout = () => {
    setActiveChat(null)
    setLeftView('')
    setRightView('')
    clearUser()
    logout()
  }

  const handleEdit = (field, currentValue) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const handleSave = (field) => {
    if (field === 'name') setName(tempValue)
    if (field === 'username') setUsername(tempValue)
    if (field === 'about') setAbout(tempValue)
    setEditingField(null)
    setTempValue('')
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  return (
    <div className="my-profile">
      {/* Content */}
      <div className="my-profile-scroll">
        <div className="my-profile-inner">

          {/* Profile Avatar Section */}
          <div className="profile-card avatar-card">
            <div className="avatar-wrapper">
              <div className="avatar-circle">
                {name.charAt(0).toUpperCase()}
              </div>
              {/* <button className="avatar-camera-btn">
                <Camera size={20} />
              </button> */}
            </div>
          </div>

          {/* Profile Fields */}
          <div className="profile-card fields-card">
            {/* Name Field */}
            <div className="profile-field">
              <div className="field-row">
                <div className="field-icon">
                  <User size={22} />
                </div>
                <div className="field-content">
                  {editingField === 'name' ? (
                    <div className="field-editing">
                      <label className="field-label">Name</label>
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="field-input"
                        autoFocus
                      />
                      <p className="field-hint">
                        This is your display name that others will see.
                      </p>
                      <div className="field-actions">
                        <button onClick={() => handleSave('name')} className="save-btn">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancel} className="cancel-btn">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="field-label">Name</label>
                      <p className="field-value">{name}</p>
                    </div>
                  )}
                </div>
                {editingField !== 'name' && (
                  <button
                    onClick={() => handleEdit('name', name)}
                    className="field-edit-btn"
                    aria-label="Edit name"
                  />
                )}
              </div>
            </div>

            {/* Username Field */}
            <div className="profile-field">
              <div className="field-row">
                <div className="field-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="field-content">
                  {editingField === 'username' ? (
                    <div className="field-editing">
                      <label className="field-label">Username</label>
                      <div className="username-input-row">
                        <span className="username-at">@</span>
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="field-input"
                          autoFocus
                        />
                      </div>
                      <p className="field-hint">
                        Your unique username for identification.
                      </p>
                      <div className="field-actions">
                        <button onClick={() => handleSave('username')} className="save-btn">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancel} className="cancel-btn">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="field-label">Username</label>
                      <p className="field-value">@{username}</p>
                    </div>
                  )}
                </div>
                {editingField !== 'username' && (
                  <button
                    onClick={() => handleEdit('username', username)}
                    className="field-edit-btn"
                    aria-label="Edit username"
                  />
                )}
              </div>
            </div>

            {/* About Field */}
            <div className="profile-field last">
              <div className="field-row">
                <div className="field-icon">
                  <MessageSquare size={22} />
                </div>
                <div className="field-content">
                  {editingField === 'about' ? (
                    <div className="field-editing">
                      <label className="field-label">About</label>
                      <textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        rows={3}
                        className="field-textarea"
                        autoFocus
                      />
                      <p className="field-hint">
                        This will be visible to your contacts.
                      </p>
                      <div className="field-actions">
                        <button onClick={() => handleSave('about')} className="save-btn">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancel} className="cancel-btn">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="field-label">About</label>
                      <p className="field-value">{about}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button onClick={handleLogout} className="logout-card">
            <div className="logout-icon">
              <LogOut size={22} />
            </div>
            <div className="logout-text">
              <h3 className="logout-title">Logout</h3>
              <p className="logout-subtitle">Sign out of your account</p>
            </div>
            <ChevronRight size={20} className="logout-chevron" />
          </button>

        </div>
      </div>
    </div>
  )
}