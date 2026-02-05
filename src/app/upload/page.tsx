'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Category = {
  id: number;
  name: string;
};

// Profanity filter - simple word-boundary aware check
// Case-insensitive, handles punctuation around words
const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'piss', 'ass', 'bitch', 'bastard',
  'fuck', 'shit', 'dick', 'cock', 'pussy', 'cunt', 'whore',
  'slut', 'fag', 'nazi', 'kike', 'spic', 'chink', 'gook',
  'retard', 'idiot', 'moron', 'stupid', 'dumbass', 'asshole',
  'motherfucker', 'bullshit', 'fucking', 'shitting'
];

function containsProfanity(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Normalize: lowercase
  const normalized = text.toLowerCase().trim();
  
  // Check each profanity term with word boundaries
  for (const term of PROFANITY_LIST) {
    // Word boundary regex - matches whole words only
    // \b ensures word boundaries, handles punctuation naturally
    const wordBoundaryPattern = new RegExp(`\\b${term}\\b`, 'i');
    
    if (wordBoundaryPattern.test(normalized)) {
      return true;
    }
    
    // Basic obfuscation check: allow punctuation/spaces between letters
    // Only check if simple (not over-engineered)
    const obfuscatedPattern = new RegExp(
      term.split('').join('[\\W\\s]*'),
      'i'
    );
    
    if (obfuscatedPattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  
  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Platform state
  const [platform, setPlatform] = useState<string>('');
  
  // Title profanity error state
  const [titleError, setTitleError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Not logged in - redirect to login
        router.push('/login?redirect=/upload');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        setCategoryError(null);

        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name')
          .order('id', { ascending: true });

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to load categories');
        }

        if (!data || data.length === 0) {
          throw new Error('No categories available');
        }

        // Convert id to number (handle bigint -> number conversion)
        const categoriesList: Category[] = data.map((cat) => ({
          id: Number(cat.id),
          name: cat.name,
        }));

        setCategories(categoriesList);

        // Default to first category
        const defaultCategoryId = categoriesList[0]?.id ?? null;
        setCategoryId(defaultCategoryId);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategoryError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      setFile(null);
      return;
    }

    // Validate file size (250MB = 250 * 1024 * 1024 bytes)
    const maxSize = 250 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 250MB');
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent concurrent uploads
    if (uploading) {
      return;
    }
    
    if (!user) {
      setError('You must be logged in to upload');
      return;
    }

    if (!title.trim()) {
      setTitleError('Please enter a title');
      return;
    }

    // Check for profanity in title
    const trimmedTitle = title.trim();
    if (containsProfanity(trimmedTitle)) {
      setTitleError('Title contains inappropriate language. Please use a different title.');
      return;
    }

    if (!file) {
      setError('Please select a video file');
      return;
    }

    // Validate category selection
    if (!categoryId) {
      setCategoryError('Please choose a category.');
      return;
    }

    // Prevent submit if categories are still loading or failed to load
    if (loadingCategories || categories.length === 0) {
      setCategoryError('Categories are not available. Please refresh the page.');
      return;
    }

    // Set uploading state immediately to prevent duplicate submissions
    setUploading(true);
    setError(null);
    setCategoryError(null);
    setTitleError(null);

    try {
      // Step 1: Get Cloudflare Stream direct upload URL with retry logic
      const getDirectUploadUrl = async (attempt: number): Promise<{ uid: string; uploadURL: string }> => {
        const delays = [300, 800, 1500];
        const maxAttempts = 3;
        
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const response = await fetch('/api/stream/direct-upload', {
              method: 'POST',
              cache: 'no-store',
              credentials: 'same-origin',
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const error = errorData.error || 'Failed to get upload URL';
              
              // Do NOT retry on 4xx (client errors) - throw immediately
              if (response.status >= 400 && response.status < 500) {
                throw new Error(error || 'Upload request failed. Please check your input and try again.');
              }
              
              // Retry only on 5xx (server errors) or network failures
              if (i < maxAttempts - 1 && response.status >= 500) {
                await new Promise(resolve => setTimeout(resolve, delays[i]));
                continue;
              }
              throw new Error(error);
            }

            const data = await response.json().catch(() => null);
            
            if (!data || !data.ok || !data.uid || !data.uploadURL) {
              // Invalid response - retry if we have attempts left
              if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delays[i]));
                continue;
              }
              throw new Error('Invalid response from upload service');
            }

            return { uid: data.uid, uploadURL: data.uploadURL };
          } catch (err: any) {
            // Network errors or fetch failures (no response) - retry
            // Only retry if it's a network error, not a 4xx client error
            const isNetworkError = !err.message || 
                                   err.message.includes('fetch') || 
                                   err.message.includes('network') ||
                                   err.message.includes('Failed to fetch');
            
            if (i < maxAttempts - 1 && isNetworkError) {
              await new Promise(resolve => setTimeout(resolve, delays[i]));
              continue;
            }
            throw err;
          }
        }
        
        throw new Error('Upload connection failed');
      };

      const { uid, uploadURL } = await getDirectUploadUrl(0);

      // Step 2: Upload file directly to Cloudflare Stream
      const formData = new FormData();
      formData.append('file', file);

      const cloudflareUploadResponse = await fetch(uploadURL, {
        method: 'POST',
        body: formData,
      });

      if (!cloudflareUploadResponse.ok) {
        const errorText = await cloudflareUploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${errorText.slice(0, 100)}`);
      }

      // Step 3: Create video record in database
      const createVideoResponse = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          category_id: categoryId,
          game_title: gameTitle.trim() || null,
          stream_uid: uid,
          platform: platform.trim() || null,
        }),
      });

      if (!createVideoResponse.ok) {
        const errorData = await createVideoResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save video information');
      }

      const { ok: videoOk } = await createVideoResponse.json();

      if (!videoOk) {
        throw new Error('Failed to save video information');
      }

      // Success - redirect to home
      router.push('/');
    } catch (err: any) {
      // Show friendly error message for connection failures
      if (err.message?.includes('connection failed') || err.message?.includes('Failed to fetch')) {
        setError('Upload connection failed. Please try again.');
      } else {
        setError(err.message || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  // If no user, will redirect (handled in useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 md:space-y-3">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Upload Your Clip
        </h1>
        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
          Share your best gaming moments with the community.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200/50 bg-white p-4 md:p-8 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {uploading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Uploading your clip... Please wait.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Title <span className="text-red-500">*</span>
            </label>
            {titleError && (
              <p className="text-sm text-red-600 dark:text-red-400">{titleError}</p>
            )}
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null); // Clear error as user edits
              }}
              required
              disabled={uploading}
              className={`w-full rounded-lg border px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 ${
                titleError
                  ? 'border-red-300 bg-white focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-600 dark:focus:ring-red-600'
                  : 'border-zinc-300 bg-white focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-600 dark:focus:ring-zinc-600'
              }`}
              placeholder="Enter clip title"
            />
          </div>

          {/* Game Title Input */}
          <div className="space-y-2">
            <label htmlFor="gameTitle" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Game Title <span className="text-zinc-400 dark:text-zinc-500 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="gameTitle"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              disabled={uploading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:border-zinc-700 focus:border-zinc-500 focus:ring-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              placeholder="e.g. Call of Duty, Fortnite, FIFA"
            />
          </div>

          {/* Game System Dropdown */}
          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Game System <span className="text-zinc-400 dark:text-zinc-500 text-xs">(optional)</span>
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={uploading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            >
              <option value="">Not selected</option>
              <option value="pc">PC</option>
              <option value="xbox">Xbox</option>
              <option value="playstation">PlayStation</option>
              <option value="switch">Switch</option>
              <option value="mobile">Mobile</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Category <span className="text-red-500">*</span>
            </label>
            {categoryError && (
              <p className="text-sm text-red-600 dark:text-red-400">{categoryError}</p>
            )}
            {loadingCategories ? (
              <div className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                No categories available. Please refresh the page.
              </div>
            ) : (
              <select
                id="category"
                value={categoryId || ''}
                onChange={(e) => {
                  setCategoryId(Number(e.target.value));
                  setCategoryError(null);
                }}
                required
                disabled={uploading || loadingCategories}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Picker */}
          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Video File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="file"
              accept="video/*"
              onChange={handleFileChange}
              required
              disabled={uploading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-700 dark:file:text-zinc-50"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Max 250MB
            </p>
            {file && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Upload Button */}
          <button
            type="submit"
            disabled={uploading || !title.trim() || !file || !categoryId || loadingCategories || categories.length === 0}
            className="w-full rounded-full bg-zinc-900 px-6 py-3.5 md:py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 touch-manipulation"
          >
            {uploading ? 'Uploading...' : 'Upload Clip'}
          </button>
          
          {/* Upload Disclaimer */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
            Your clip is uploading! It can take up to a minute or two to finish processing before it shows up on the home feed.
          </p>
        </form>
      </div>
    </div>
  );
}
