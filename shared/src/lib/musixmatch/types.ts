export interface MxmApiHeader {
  status_code: number;
  execute_time?: number;
  available?: number;
}

export interface MxmGenre {
  music_genre_id: number;
  music_genre_name: string;
  music_genre_name_extended?: string;
}

export interface MxmTrackRaw {
  track_id: number;
  commontrack_id: number;
  track_name: string;
  artist_name: string;
  album_name?: string;
  track_length?: number;
  track_isrc?: string;
  track_spotify_id?: string;
  track_rating?: number;
  explicit?: number;
  has_lyrics?: number;
  has_richsync?: number;
  has_lyrics_analysis?: number;
  album_coverart_100x100?: string;
  album_coverart_350x350?: string;
  primary_genres?: {
    music_genre_list?: Array<{ music_genre: MxmGenre }>;
  };
  first_release_date?: string;
}

export interface MxmLyricsRaw {
  lyrics_id: number;
  lyrics_body: string;
  lyrics_language?: string;
  explicit?: number;
  lyrics_copyright?: string;
}

export interface MxmAnalysisMood {
  main_moods?: string[];
}

export interface MxmAnalysisTheme {
  theme: string;
  quotes?: string[];
}

export interface MxmAnalysisRaw {
  meaning?: { explanation?: string };
  moods?: MxmAnalysisMood;
  themes?: { main_themes?: MxmAnalysisTheme[] };
  rating?: { audience?: string; descriptor?: string };
}

export interface MxmRichsyncRaw {
  richsync_body?: string;
  richsync_language?: string;
  restricted?: number;
}

export interface MxmAnalysisSearchHit {
  track: MxmTrackRaw;
  analysis?: MxmAnalysisRaw;
}

export interface MxmAnalysisSearchResponse {
  message: {
    header: MxmApiHeader;
    body: { track_list: MxmAnalysisSearchHit[] } | [];
  };
}

export interface MxmRichsyncResponse {
  message: {
    header: MxmApiHeader;
    body: { richsync: MxmRichsyncRaw } | [];
  };
}

export interface MxmAnalysisSearchQuery {
  moods?: string[];
  themes?: string[];
  genre?: string[];
  meaning?: string;
  lyrics_language?: string;
}

export interface MxmSearchResponse {
  message: {
    header: MxmApiHeader;
    body: { track_list: Array<{ track: MxmTrackRaw }> } | [];
  };
}

export interface MxmLyricsResponse {
  message: {
    header: MxmApiHeader;
    body: { lyrics: MxmLyricsRaw } | [];
  };
}

export interface MxmAnalysisResponse {
  message: {
    header: MxmApiHeader;
    body: { analysis: MxmAnalysisRaw } | [];
  };
}