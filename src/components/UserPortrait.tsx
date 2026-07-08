import { useEffect, useState } from 'react';
import { cn } from '../utils';
import { getToken } from '../auth';

type PortraitSize = 'hero' | 'large' | 'medium' | 'small';

const SIZE_CLASS: Record<PortraitSize, string> = {
  hero: 'w-40 h-[13.5rem] sm:w-48 sm:h-64 md:w-56 md:h-[18rem]',
  large: 'w-32 h-40 sm:w-36 sm:h-[11rem]',
  medium: 'w-20 h-24',
  small: 'w-12 h-14',
};

const TEXT_CLASS: Record<PortraitSize, string> = {
  hero: 'text-4xl sm:text-5xl',
  large: 'text-3xl',
  medium: 'text-xl',
  small: 'text-sm',
};

interface UserPortraitProps {
  userId: string;
  name: string;
  hasProfileImage?: boolean;
  size?: PortraitSize;
  className?: string;
  framed?: boolean;
}

export function UserPortrait({
  userId,
  name,
  hasProfileImage = false,
  size = 'large',
  className,
  framed = true,
}: UserPortraitProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(!hasProfileImage);
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!hasProfileImage) {
      setUrl(null);
      setFailed(true);
      return;
    }

    let objectUrl: string | null = null;
    setFailed(false);

    const token = getToken();
    fetch(`/api/users/${userId}/avatar`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => (res.ok ? res.blob() : Promise.reject()))
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, hasProfileImage]);

  const frame = framed
    ? 'rounded-[1.5rem] rounded-br-md shadow-2xl ring-1 ring-gold/35 border border-gold/20'
    : 'rounded-2xl';

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        className={cn('object-cover object-top shrink-0', frame, SIZE_CLASS[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center font-display font-semibold uppercase',
        'bg-charcoal text-gold-light border border-gold/25',
        frame,
        SIZE_CLASS[size],
        TEXT_CLASS[size],
        className,
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
}