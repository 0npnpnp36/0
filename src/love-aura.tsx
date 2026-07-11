import { useState } from 'react'

const LOVE_BY_LANG = [
  { lang: 'English', word: 'love' },
  { lang: 'Chinese', word: '爱' },
  { lang: 'Hindi', word: 'प्रेम' },
  { lang: 'Spanish', word: 'amor' },
  { lang: 'Arabic', word: 'حب', rtl: true },
  { lang: 'French', word: 'amour' },
  { lang: 'Bengali', word: 'ভালোবাসা' },
  { lang: 'Portuguese', word: 'amor' },
  { lang: 'Russian', word: 'любовь' },
  { lang: 'Urdu', word: 'محبت', rtl: true },
  { lang: 'Indonesian', word: 'cinta' },
  { lang: 'German', word: 'Liebe' },
  { lang: 'Japanese', word: '愛' },
  { lang: 'Marathi', word: 'प्रेम' },
  { lang: 'Telugu', word: 'ప్రేమ' },
  { lang: 'Turkish', word: 'aşk' },
  { lang: 'Tamil', word: 'அன்பு' },
  { lang: 'Vietnamese', word: 'yêu' },
  { lang: 'Tagalog', word: 'pag-ibig' },
  { lang: 'Korean', word: '사랑' },
  { lang: 'Persian', word: 'عشق', rtl: true },
  { lang: 'Hausa', word: 'soyayya' },
  { lang: 'Swahili', word: 'upendo' },
  { lang: 'Javanese', word: 'tresna' },
  { lang: 'Italian', word: 'amore' },
  { lang: 'Punjabi', word: 'ਪਿਆਰ' },
  { lang: 'Gujarati', word: 'પ્રેમ' },
  { lang: 'Thai', word: 'ความรัก' },
  { lang: 'Kannada', word: 'ಪ್ರೀತಿ' },
  { lang: 'Amharic', word: 'ፍቅር' },
  { lang: 'Bhojpuri', word: 'प्रेम' },
  { lang: 'Malayalam', word: 'സ്നേഹം' },
  { lang: 'Polish', word: 'miłość' },
] as const

type LoveEntry = (typeof LOVE_BY_LANG)[number]

function pickLove(): LoveEntry {
  return LOVE_BY_LANG[(Math.random() * LOVE_BY_LANG.length) | 0]
}

export function LoveAura() {
  const [entry] = useState(pickLove)

  return (
    <div className="love-aura" aria-hidden="true">
      <span
        className="love-word"
        lang={entry.lang}
        dir={'rtl' in entry && entry.rtl ? 'rtl' : 'ltr'}
      >
        {entry.word}
      </span>
    </div>
  )
}
