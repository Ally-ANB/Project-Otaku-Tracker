-- Playlist personalizada do Rádio Hunter (JSON array: { titulo, url, id })
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS radio_playlist JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN perfis.radio_playlist IS 'Fila do Radio Hunter: array JSON de { titulo, url, id }';
