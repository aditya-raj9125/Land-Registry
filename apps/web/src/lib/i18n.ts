import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "nav": {
        "search": "Search Land",
        "map": "Map View",
        "verify": "Verify Property",
        "nri": "NRI Services",
        "dashboard": "My Properties"
      },
      "hero": {
        "badge": "National Blockchain Land Registry",
        "title_line1": "YOUR LAND,",
        "title_line2": "FOREVER",
        "title_line3": "YOURS.",
        "desc": "India's first tamper-proof land registry. Every title certificate lives on a permanent, immutable record."
      },
      "stats": {
        "parcels": "Parcels On-Chain",
        "states": "States Connected",
        "disputes": "Disputes Prevented",
        "revenue": "Revenue Secured"
      }
    }
  },
  hi: {
    translation: {
      "nav": {
        "search": "भूमि खोजें",
        "map": "मानचित्र",
        "verify": "सत्यापन",
        "nri": "प्रवासी सेवाएँ",
        "dashboard": "मेरी संपत्ति"
      },
      "hero": {
        "badge": "राष्ट्रीय ब्लॉकचेन भूमि रजिस्ट्री",
        "title_line1": "आपकी भूमि,",
        "title_line2": "हमेशा के लिए",
        "title_line3": "आपकी।",
        "desc": "भारत की पहली छेड़छाड़-मुक्त भूमि रजिस्ट्री। प्रत्येक शीर्षक प्रमाण पत्र एक स्थायी रिकॉर्ड पर रहता है।"
      },
      "stats": {
        "parcels": "ब्लॉकचेन पर पार्सल",
        "states": "जुड़े हुए राज्य",
        "disputes": "विवाद रोके गए",
        "revenue": "राजस्व सुरक्षित"
      }
    }
  },
  mr: {
    translation: {
      "nav": {
        "search": "जमीन शोधा",
        "map": "नकाशा",
        "verify": "पडताळणी",
        "nri": "अनिवासी सेवा",
        "dashboard": "माझी मालमत्ता"
      }
    }
  },
  ta: {
    translation: {
      "nav": {
        "search": "நிலத்தைத் தேடு",
        "map": "வரைபடம்",
        "verify": "சரிபார்ப்பு",
        "nri": "என்आरஐ சேவைகள்",
        "dashboard": "எனது சொத்துக்கள்"
      }
    }
  }
  // ... Additional languages (Telugu, Bengali, Gujarati, Kannada, Malayalam) would follow the same pattern
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
