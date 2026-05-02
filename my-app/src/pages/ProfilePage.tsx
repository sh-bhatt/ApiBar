import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '../components/PageLoader'
import { User, Building2, Link as LinkIcon, MapPin, Phone, Camera, Loader2, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { getQueryErrorMessage } from '../lib/queryError'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'provider' | 'consumer'
  plan: 'free' | 'pro'
  createdAt: string
  avatar: string
  bio: string
  company: string
  website: string
  location: string
  phone: string
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800 border-red-200'
    case 'provider': return 'bg-green-100 text-green-800 border-green-200'
    case 'consumer': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getPlanBadgeColor(plan: string) {
  switch (plan) {
    case 'pro': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'free': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getRoleGradient(role: string) {
  switch (role) {
    case 'admin': return 'from-red-500 to-red-600'
    case 'provider': return 'from-green-500 to-green-600'
    case 'consumer': return 'from-blue-500 to-blue-600'
    default: return 'from-gray-500 to-gray-600'
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatMemberSince(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const years = now.getFullYear() - date.getFullYear()
  const months = now.getMonth() - date.getMonth()
  const totalMonths = years * 12 + months

  if (totalMonths < 1) return 'Just joined'
  if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`
  return `${Math.floor(totalMonths / 12)} year${Math.floor(totalMonths / 12) === 1 ? '' : 's'}`
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    company: '',
    website: '',
    location: '',
    phone: ''
  })
  const [hasChanges, setHasChanges] = useState(false)

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      return data as UserProfile
    }
  })

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        company: profile.company || '',
        website: profile.website || '',
        location: profile.location || '',
        phone: profile.phone || ''
      })
    }
  }, [profile])

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      const { data } = await api.patch('/profile', updates)
      return data as UserProfile
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile)
      setHasChanges(false)
      toast.success('Profile updated successfully!')
    },
    onError: () => {
      toast.error('Failed to update profile')
    }
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (avatar: string) => {
      const { data } = await api.post('/profile/avatar', { avatar })
      return data as UserProfile
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile)
      toast.success('Avatar updated successfully!')
    },
    onError: () => {
      toast.error('Failed to upload avatar')
    }
  })

  if (isLoading) {
    return <PageLoader label="Loading profile" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getQueryErrorMessage(error)}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Profile not found
      </div>
    )
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateProfileMutation.mutate(formData)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploading(true)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        uploadAvatarMutation.mutate(base64)
        setUploading(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read image')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setUploading(false)
      toast.error('Failed to process image')
    }
  }

  const bioLength = formData.bio.length
  const maxBioLength = 200

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account information and preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="relative w-32 h-32 rounded-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 transition-all"
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getRoleGradient(profile.role)} flex items-center justify-center text-white text-3xl font-bold`}>
                    {getInitials(profile.name)}
                  </div>
                )}

                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </div>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>

            {/* Email */}
            <p className="text-gray-500 text-sm mb-4">{profile.email}</p>

            {/* Badges */}
            <div className="flex justify-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(profile.role)}`}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(profile.plan)}`}>
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
              </span>
            </div>

            {/* Member Since */}
            <p className="text-xs text-gray-400">
              Member since {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {/* Right Column - Editable Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  maxLength={maxBioLength}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {bioLength}/{maxBioLength} characters
                </p>
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Your company name"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || updateProfileMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Total API Requests</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">APIs Registered</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{formatMemberSince(profile.createdAt)}</p>
          <p className="text-sm text-gray-500">Member Since</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(profile.plan)}`}>
              {profile.plan.toUpperCase()}
            </span>
          </div>
          {profile.plan === 'free' && (
            <button className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1 mx-auto">
              <Sparkles className="w-3 h-3" />
              Upgrade
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
