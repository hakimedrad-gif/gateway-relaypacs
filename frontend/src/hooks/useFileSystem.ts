import { useState, useCallback } from 'react';

export const useFileSystem = () => {
  const isSupported = 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
  const [error, setError] = useState<Error | null>(null);

  const pickFiles = useCallback(
    async (options: any = {}): Promise<File[]> => {
      setError(null);
      if (!isSupported) {
        throw new Error('File System Access API not supported');
      }

      try {
        const handles = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'DICOM Files',
              accept: {
                'application/dicom': ['.dcm', '.dicom', '.ima', ''],
                'application/octet-stream': ['.dcm', ''],
              },
            },
          ],
          ...options,
        });

        const files: File[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          files.push(file);
        }
        return files;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return []; // User cancelled
        }
        console.error('File picker error:', err);
        setError(err);
        return [];
      }
    },
    [isSupported],
  );

  const pickDirectory = useCallback(async (): Promise<File[]> => {
    setError(null);
    if (!isSupported) {
      throw new Error('File System Access API not supported');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];

      // Recursive function to traverse directory
      const processHandle = async (handle: any) => {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          // Basic filtering for DICOM-like files (optional, but good for performance)
          // Accepting all for now as DICOM extensions vary
          files.push(file);
        } else if (handle.kind === 'directory') {
          for await (const entry of handle.values()) {
            await processHandle(entry);
          }
        }
      };

      await processHandle(dirHandle);
      return files;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      console.error('Directory picker error:', err);
      setError(err);
      return [];
    }
  }, [isSupported]);

  return { isSupported, pickFiles, pickDirectory, error };
};
