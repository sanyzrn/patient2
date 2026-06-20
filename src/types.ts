export interface Catalog {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  pages: string[];
  pdfUrl?: string;
  date: string;
  pageCount: number;
  category: string;
  language?: 'fa' | 'en';
  toc?: { title: string; page: number }[];
}

export interface Video {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  videoUrl: string;
  date: string;
  duration?: string;
}

export interface ViewerSettings {
  sound: boolean;
  autoPlay: boolean;
}

export interface Banner {
  id: string;
  type: 'text' | 'image';
  title?: string;
  description?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  link?: string;
}

// Global definition for external data file
declare global {
  interface Window {
    NAFAS_DATA?: {
      catalogs: Catalog[];
      videos: Video[];
      banners?: Banner[];
    };
  }
}
