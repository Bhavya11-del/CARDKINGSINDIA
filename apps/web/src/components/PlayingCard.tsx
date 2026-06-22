import { motion } from 'framer-motion';

interface PlayingCardProps {
  suit?: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank?: string;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  dealDelay?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLORS = { spades: 'text-gray-900', hearts: 'text-red-600', diamonds: 'text-red-600', clubs: 'text-gray-900' };

const SIZE_MAP = {
  sm: { w: 'w-10 h-14 text-xs', rank: 'text-xs', suit: 'text-base' },
  md: { w: 'w-14 h-20 text-sm', rank: 'text-sm', suit: 'text-xl' },
  lg: { w: 'w-20 h-28 text-base', rank: 'text-base', suit: 'text-3xl' },
};

export default function PlayingCard({
  suit, rank, faceDown = false, selected = false, onClick, dealDelay = 0,
  size = 'md', disabled = false, className = '',
}: PlayingCardProps) {
  const s = SIZE_MAP[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, rotate: -15, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: selected ? 1.08 : 1 }}
      transition={{ delay: dealDelay, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={!disabled ? { y: -6, scale: 1.05, transition: { duration: 0.15 } } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled && onClick ? onClick : undefined}
      className={`
        relative ${s.w} rounded-lg cursor-pointer select-none transition-shadow
        ${selected ? 'shadow-[0_0_20px_rgba(201,168,76,0.8)] -translate-y-4' : 'shadow-card hover:shadow-card-hover'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{ transformOrigin: 'bottom center' }}
    >
      {faceDown ? (
        /* Card Back */
        <div className={`w-full h-full rounded-lg card-back flex items-center justify-center`}>
          <div className="text-gold/40 text-2xl">♛</div>
          <div className="absolute inset-1 rounded border border-gold/20" />
        </div>
      ) : (
        /* Card Front */
        <div className="w-full h-full rounded-lg bg-[#fef9f0] border border-[#d4b896] flex flex-col p-1 relative overflow-hidden">
          {/* Shine */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-lg pointer-events-none" />
          {/* Top-left rank/suit */}
          <div className={`${SUIT_COLORS[suit!]} leading-none`}>
            <div className={`font-bold ${s.rank}`}>{rank}</div>
            <div className={`${s.suit} leading-none`}>{SUIT_SYMBOLS[suit!]}</div>
          </div>
          {/* Center suit */}
          <div className={`flex-1 flex items-center justify-center ${SUIT_COLORS[suit!]}`}>
            <span className={`${s.suit} opacity-70`}>{SUIT_SYMBOLS[suit!]}</span>
          </div>
          {/* Bottom-right (rotated) */}
          <div className={`${SUIT_COLORS[suit!]} leading-none self-end rotate-180`}>
            <div className={`font-bold ${s.rank}`}>{rank}</div>
            <div className={`${s.suit} leading-none`}>{SUIT_SYMBOLS[suit!]}</div>
          </div>
          {selected && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-gold"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}
