// themes.js
const Store = require('electron-store');
const store = new Store();

const themes = {
    auroraBreeze: {
        name: 'Aurora Breeze',
        primaryColor: '#64FFDA',
        primaryHover: 'linear-gradient(135deg, #64FFDA 0%, #48A999 100%)',
        bgDark: 'linear-gradient(180deg, #0A192F 0%, #040C15 100%)',
        bgDarker: '#020610',
        textColor: '#C9FFF3',
        sliderBg: 'linear-gradient(90deg, #153D57 0%, #0E2837 100%)',
        controlBg: 'rgba(10, 25, 47, 0.95)',
        accentColor: '#98FFEA',
        shadowColor: 'rgba(100, 255, 218, 0.25)',
        borderGlow: '0 0 15px rgba(152, 255, 234, 0.35)',
        activeGlow: '0 0 30px rgba(152, 255, 234, 0.55)',
        effect: 'linear-gradient(180deg, rgba(100, 255, 218, 0.08) 0%, transparent 100%)'
    },
    tokyoNight: {
        name: 'Tokyo Night',
        primaryColor: '#7aa2f7',
        primaryHover: 'linear-gradient(135deg, #89ddff 0%, #7aa2f7 100%)',
        bgDark: 'linear-gradient(180deg, #1a1b26 0%, #16161e 100%)',
        bgDarker: '#13141c',
        textColor: '#c0caf5',
        sliderBg: 'linear-gradient(90deg, #24283b 0%, #1f2335 100%)',
        controlBg: 'rgba(26, 27, 38, 0.95)',
        accentColor: '#bb9af7',
        shadowColor: 'rgba(122, 162, 247, 0.25)',
        borderGlow: '0 0 15px rgba(122, 162, 247, 0.35)',
        activeGlow: '0 0 30px rgba(122, 162, 247, 0.6)',
        effect: 'radial-gradient(circle at 50% 0%, rgba(122, 162, 247, 0.12), transparent 70%)'
    },
    catppuccinMocha: {
        name: 'Catppuccin Mocha',
        primaryColor: '#cba6f7',
        primaryHover: 'linear-gradient(135deg, #f5c2e7 0%, #cba6f7 100%)',
        bgDark: 'linear-gradient(180deg, #1e1e2e 0%, #11111b 100%)',
        bgDarker: '#0e0e16',
        textColor: '#cdd6f4',
        sliderBg: 'linear-gradient(90deg, #313244 0%, #181825 100%)',
        controlBg: 'rgba(30, 30, 46, 0.95)',
        accentColor: '#89dceb',
        shadowColor: 'rgba(203, 166, 247, 0.25)',
        borderGlow: '0 0 15px rgba(203, 166, 247, 0.35)',
        activeGlow: '0 0 25px rgba(203, 166, 247, 0.55)',
        effect: 'radial-gradient(circle at 80% 20%, rgba(203, 166, 247, 0.1), transparent 60%)'
    },
    synthwave84: {
        name: "Synthwave '84",
        primaryColor: '#ff7edb',
        primaryHover: 'linear-gradient(135deg, #ff7edb 0%, #ff5277 100%)',
        bgDark: 'linear-gradient(180deg, #241734 0%, #12091c 100%)',
        bgDarker: '#0c0513',
        textColor: '#ffbdf0',
        sliderBg: 'linear-gradient(90deg, #3b2257 0%, #201135 100%)',
        controlBg: 'rgba(36, 23, 52, 0.95)',
        accentColor: '#fede5d',
        shadowColor: 'rgba(255, 126, 219, 0.3)',
        borderGlow: '0 0 16px rgba(255, 126, 219, 0.45)',
        activeGlow: '0 0 32px rgba(254, 222, 93, 0.65)',
        effect: 'linear-gradient(0deg, rgba(255, 126, 219, 0.06) 1px, transparent 1px) 0 0 / 40px 40px'
    },
    nordicFrost: {
        name: 'Nordic Frost',
        primaryColor: '#88c0d0',
        primaryHover: 'linear-gradient(135deg, #8fbcbb 0%, #81a1c1 100%)',
        bgDark: 'linear-gradient(180deg, #2e3440 0%, #1e222a 100%)',
        bgDarker: '#16191f',
        textColor: '#eceff4',
        sliderBg: 'linear-gradient(90deg, #3b4252 0%, #242933 100%)',
        controlBg: 'rgba(46, 52, 64, 0.95)',
        accentColor: '#a3be8c',
        shadowColor: 'rgba(136, 192, 208, 0.25)',
        borderGlow: '0 0 14px rgba(136, 192, 208, 0.35)',
        activeGlow: '0 0 28px rgba(136, 192, 208, 0.55)',
        effect: 'linear-gradient(180deg, rgba(136, 192, 208, 0.08) 0%, transparent 80%)'
    },
    cyberpunk2077: {
        name: 'Cyberpunk 2077',
        primaryColor: '#fee801',
        primaryHover: 'linear-gradient(135deg, #fff154 0%, #fcee0a 100%)',
        bgDark: 'linear-gradient(180deg, #0d0f12 0%, #050608 100%)',
        bgDarker: '#000000',
        textColor: '#ffffff',
        sliderBg: 'linear-gradient(90deg, #2b2b10 0%, #17180d 100%)',
        controlBg: 'rgba(13, 15, 18, 0.95)',
        accentColor: '#00f0ff',
        shadowColor: 'rgba(254, 232, 1, 0.3)',
        borderGlow: '0 0 16px rgba(254, 232, 1, 0.45)',
        activeGlow: '0 0 32px rgba(0, 240, 255, 0.7)',
        effect: 'repeating-linear-gradient(0deg, rgba(254, 232, 1, 0.03) 0px, transparent 2px, transparent 4px)'
    },
    deepAbyss: {
        name: 'Deep Abyss',
        primaryColor: '#00f5d4',
        primaryHover: 'linear-gradient(135deg, #7bf1a8 0%, #00bbf9 100%)',
        bgDark: 'linear-gradient(180deg, #051923 0%, #000c14 100%)',
        bgDarker: '#00050a',
        textColor: '#caf0f8',
        sliderBg: 'linear-gradient(90deg, #0a3144 0%, #031c28 100%)',
        controlBg: 'rgba(5, 25, 35, 0.95)',
        accentColor: '#00bbf9',
        shadowColor: 'rgba(0, 245, 212, 0.25)',
        borderGlow: '0 0 15px rgba(0, 245, 212, 0.35)',
        activeGlow: '0 0 30px rgba(0, 245, 212, 0.6)',
        effect: 'radial-gradient(circle at 30% 70%, rgba(0, 245, 212, 0.12), transparent 60%)'
    },
    rosePine: {
        name: 'Rosé Pine',
        primaryColor: '#ebbcba',
        primaryHover: 'linear-gradient(135deg, #f6c177 0%, #ebbcba 100%)',
        bgDark: 'linear-gradient(180deg, #191724 0%, #110f1a 100%)',
        bgDarker: '#0b0a12',
        textColor: '#e0def4',
        sliderBg: 'linear-gradient(90deg, #26233a 0%, #181624 100%)',
        controlBg: 'rgba(25, 23, 36, 0.95)',
        accentColor: '#31748f',
        shadowColor: 'rgba(235, 188, 186, 0.25)',
        borderGlow: '0 0 15px rgba(235, 188, 186, 0.35)',
        activeGlow: '0 0 28px rgba(246, 193, 119, 0.55)',
        effect: 'radial-gradient(circle at 70% 30%, rgba(235, 188, 186, 0.1), transparent 60%)'
    },
    draculaVamp: {
        name: 'Dracula',
        primaryColor: '#bd93f9',
        primaryHover: 'linear-gradient(135deg, #ff79c6 0%, #bd93f9 100%)',
        bgDark: 'linear-gradient(180deg, #282a36 0%, #191a21 100%)',
        bgDarker: '#101116',
        textColor: '#f8f8f2',
        sliderBg: 'linear-gradient(90deg, #44475a 0%, #21222c 100%)',
        controlBg: 'rgba(40, 42, 54, 0.95)',
        accentColor: '#50fa7b',
        shadowColor: 'rgba(189, 147, 249, 0.25)',
        borderGlow: '0 0 15px rgba(189, 147, 249, 0.35)',
        activeGlow: '0 0 30px rgba(80, 250, 123, 0.55)',
        effect: 'radial-gradient(circle at 50% 100%, rgba(189, 147, 249, 0.15), transparent 70%)'
    },
    cosmos: {
        name: 'Cosmos',
        primaryColor: '#7B2DFF',
        primaryHover: 'linear-gradient(135deg, #9D50FF 0%, #6223E0 100%)',
        bgDark: 'linear-gradient(180deg, #0B0B2B 0%, #040412 100%)',
        bgDarker: '#020208',
        textColor: '#E2D8FF',
        sliderBg: 'linear-gradient(90deg, #2A1B54 0%, #1A0F33 100%)',
        controlBg: 'rgba(11, 11, 43, 0.95)',
        accentColor: '#B76EFF',
        shadowColor: 'rgba(123, 45, 255, 0.25)',
        borderGlow: '0 0 15px rgba(183, 110, 255, 0.3)',
        activeGlow: '0 0 25px rgba(183, 110, 255, 0.6)',
        effect: 'radial-gradient(circle at 10% 20%, rgba(183, 110, 255, 0.1) 1px, transparent 1px)'
    },
    quantum: {
        name: 'Quantum Matrix',
        primaryColor: '#00FFB2',
        primaryHover: 'linear-gradient(135deg, #00FFB2 0%, #00CC8E 100%)',
        bgDark: 'linear-gradient(180deg, #001614 0%, #000A09 100%)',
        bgDarker: '#000504',
        textColor: '#B3FFF1',
        sliderBg: 'linear-gradient(90deg, #003D35 0%, #002622 100%)',
        controlBg: 'rgba(0, 22, 20, 0.95)',
        accentColor: '#00FFD1',
        shadowColor: 'rgba(0, 255, 178, 0.25)',
        borderGlow: '0 0 15px rgba(0, 255, 209, 0.3)',
        activeGlow: '0 0 30px rgba(0, 255, 209, 0.5)',
        effect: 'linear-gradient(0deg, rgba(0, 255, 178, 0.05) 1px, transparent 1px) 0 0 / 50px 50px'
    },
    neonDreams: {
        name: 'Neon Dreams',
        primaryColor: '#FF00FF',
        primaryHover: 'linear-gradient(135deg, #FF33FF 0%, #CC00CC 100%)',
        bgDark: 'linear-gradient(180deg, #1A0B33 0%, #0D0519 100%)',
        bgDarker: '#06030D',
        textColor: '#FFB3FF',
        sliderBg: 'linear-gradient(90deg, #4D0066 0%, #330044 100%)',
        controlBg: 'rgba(26, 11, 51, 0.95)',
        accentColor: '#FF4DFF',
        shadowColor: 'rgba(255, 0, 255, 0.25)',
        borderGlow: '0 0 15px rgba(255, 77, 255, 0.3)',
        activeGlow: '0 0 30px rgba(255, 77, 255, 0.5)',
        effect: 'linear-gradient(90deg, rgba(255, 0, 255, 0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(255, 0, 255, 0.05) 1px, transparent 1px)'
    },
    crystalWave: {
        name: 'Crystal Wave',
        primaryColor: '#3CFFFF',
        primaryHover: 'linear-gradient(135deg, #50F9F9 0%, #00E5E5 100%)',
        bgDark: 'linear-gradient(180deg, #082B2B 0%, #041515 100%)',
        bgDarker: '#020A0A',
        textColor: '#E0FFFF',
        sliderBg: 'linear-gradient(90deg, #0A4D4D 0%, #063333 100%)',
        controlBg: 'rgba(8, 43, 43, 0.95)',
        accentColor: '#80FFFF',
        shadowColor: 'rgba(60, 255, 255, 0.25)',
        borderGlow: '0 0 15px rgba(128, 255, 255, 0.3)',
        activeGlow: '0 0 30px rgba(128, 255, 255, 0.5)',
        effect: 'repeating-linear-gradient(45deg, rgba(60, 255, 255, 0.03) 0px, transparent 5px)'
    },
    emeraldForest: {
        name: 'Emerald Forest',
        primaryColor: '#00FF9D',
        primaryHover: 'linear-gradient(135deg, #00FF9D 0%, #00B36F 100%)',
        bgDark: 'linear-gradient(180deg, #004D31 0%, #00261A 100%)',
        bgDarker: '#001A11',
        textColor: '#B3FFE0',
        sliderBg: 'linear-gradient(90deg, #006644 0%, #004D31 100%)',
        controlBg: 'rgba(0, 77, 49, 0.95)',
        accentColor: '#4DFFB8',
        shadowColor: 'rgba(0, 255, 157, 0.25)',
        borderGlow: '0 0 15px rgba(77, 255, 184, 0.3)',
        activeGlow: '0 0 30px rgba(77, 255, 184, 0.5)',
        effect: 'repeating-radial-gradient(circle at 50% -20%, rgba(0, 255, 157, 0.05) 0px, transparent 40px)'
    },
    bloodMoon: {
        name: 'Blood Moon',
        primaryColor: '#FF2D55',
        primaryHover: 'linear-gradient(135deg, #FF4D6D 0%, #FF1A1A 100%)',
        bgDark: 'linear-gradient(180deg, #1A0005 0%, #0D0003 100%)',
        bgDarker: '#080001',
        textColor: '#FFD6DD',
        sliderBg: 'linear-gradient(90deg, #4D0011 0%, #330008 100%)',
        controlBg: 'rgba(26, 0, 5, 0.95)',
        accentColor: '#FF6B88',
        shadowColor: 'rgba(255, 45, 85, 0.25)',
        borderGlow: '0 0 15px rgba(255, 107, 136, 0.3)',
        activeGlow: '0 0 30px rgba(255, 107, 136, 0.5)',
        effect: 'radial-gradient(circle at 50% 50%, rgba(255, 45, 85, 0.15), transparent 60%)'
    },
    solarFlare: {
        name: 'Solar Flare',
        primaryColor: '#FFB302',
        primaryHover: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
        bgDark: 'linear-gradient(180deg, #261500 0%, #1A0F00 100%)',
        bgDarker: '#0D0800',
        textColor: '#FFE5B3',
        sliderBg: 'linear-gradient(90deg, #663300 0%, #4D2600 100%)',
        controlBg: 'rgba(38, 21, 0, 0.95)',
        accentColor: '#FFC733',
        shadowColor: 'rgba(255, 179, 2, 0.25)',
        borderGlow: '0 0 15px rgba(255, 199, 51, 0.3)',
        activeGlow: '0 0 30px rgba(255, 199, 51, 0.5)',
        effect: 'radial-gradient(circle at 50% -20%, rgba(255, 179, 2, 0.2), transparent 70%)'
    },
    crimsonNight: {
        name: 'Crimson Night',
        primaryColor: '#FF3366',
        primaryHover: 'linear-gradient(135deg, #FF4D7F 0%, #FF1A4D 100%)',
        bgDark: 'linear-gradient(180deg, #330014 0%, #1A000A 100%)',
        bgDarker: '#0D0005',
        textColor: '#FFB3C6',
        sliderBg: 'linear-gradient(90deg, #800033 0%, #660029 100%)',
        controlBg: 'rgba(51, 0, 20, 0.95)',
        accentColor: '#FF809F',
        shadowColor: 'rgba(255, 51, 102, 0.25)',
        borderGlow: '0 0 15px rgba(255, 128, 159, 0.3)',
        activeGlow: '0 0 30px rgba(255, 128, 159, 0.5)',
        effect: 'radial-gradient(circle at 80% 10%, rgba(255, 51, 102, 0.15), transparent 60%)'
    },
    defaultOrange: {
        name: 'Classic Orange',
        primaryColor: '#ff6600',
        primaryHover: 'linear-gradient(135deg, #ff8533 0%, #ff4d00 100%)',
        bgDark: 'linear-gradient(180deg, #232323 0%, #1a1a1a 100%)',
        bgDarker: '#141414',
        textColor: '#ffffff',
        sliderBg: 'linear-gradient(90deg, #444 0%, #333 100%)',
        controlBg: 'rgba(20, 20, 20, 0.95)',
        accentColor: '#ff8533',
        shadowColor: 'rgba(255, 101, 0, 0.2)',
        borderGlow: '0 0 10px rgba(255, 101, 0, 0.3)',
        activeGlow: '0 0 20px rgba(255, 101, 0, 0.5)',
        effect: 'none'
    },
    default: {
        name: 'Aurora Breeze',
        primaryColor: '#64FFDA',
        primaryHover: 'linear-gradient(135deg, #64FFDA 0%, #48A999 100%)',
        bgDark: 'linear-gradient(180deg, #0A192F 0%, #040C15 100%)',
        bgDarker: '#020610',
        textColor: '#C9FFF3',
        sliderBg: 'linear-gradient(90deg, #153D57 0%, #0E2837 100%)',
        controlBg: 'rgba(10, 25, 47, 0.95)',
        accentColor: '#98FFEA',
        shadowColor: 'rgba(100, 255, 218, 0.25)',
        borderGlow: '0 0 15px rgba(152, 255, 234, 0.35)',
        activeGlow: '0 0 30px rgba(152, 255, 234, 0.55)',
        effect: 'linear-gradient(180deg, rgba(100, 255, 218, 0.08) 0%, transparent 100%)'
    }
};

const injectAdvancedCSS = (theme) => {
    const style = document.createElement('style');
    const effectCSS = theme.effect && theme.effect !== 'none'
        ? `background-image: ${theme.effect}, ${theme.bgDark};`
        : `background-image: ${theme.bgDark};`;

    style.textContent = `
        :root {
            --theme-transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body {
            ${effectCSS}
            background-color: var(--bg-darker);
            transition: var(--theme-transition);
        }

        .player-section {
            background-image: var(--bg-dark);
        }

        #controls-overlay {
            background: linear-gradient(180deg, transparent 0%, var(--control-bg) 100%) !important;
            backdrop-filter: blur(16px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        }

        .control-button {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .control-button:hover {
            background-color: rgba(255, 255, 255, 0.12);
            color: var(--primary-color) !important;
            box-shadow: var(--border-glow);
            transform: scale(1.08) translateY(-1px);
        }

        .control-button:active {
            transform: scale(0.95);
        }

        .control-button.active {
            color: var(--primary-color) !important;
            box-shadow: var(--active-glow);
        }

        #time-slider, #volume-slider {
            --track-filled-color: var(--primary-color) !important;
            --glow-color: var(--shadow-color) !important;
        }

        #time-slider::-webkit-slider-thumb,
        #volume-slider::-webkit-slider-thumb {
            box-shadow: var(--active-glow);
            transition: var(--theme-transition);
        }

        .time-preview {
            background: var(--primary-color) !important;
            box-shadow: var(--active-glow) !important;
            color: #fff !important;
        }

        .time-preview::after {
            border-top-color: var(--primary-color) !important;
        }

        .speed-button:hover {
            color: var(--primary-color) !important;
            border-color: var(--primary-color);
        }

        .speed-option:hover,
        .speed-option.active {
            color: var(--primary-color) !important;
        }

        #playlist-panel {
            background: var(--bg-darker) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.08);
            transition: var(--theme-transition);
        }

        .playlist-header h3 {
            color: var(--primary-color) !important;
        }

        .playlist-item {
            backdrop-filter: blur(10px);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .playlist-item:hover {
            transform: translateX(4px);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: var(--border-glow);
        }

        .playlist-item.active {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: var(--primary-color) !important;
            box-shadow: var(--border-glow);
        }

        .playlist-item.active .title,
        .playlist-item.active .duration {
            color: var(--primary-color) !important;
            font-weight: 600;
        }

        #media-player {
            box-shadow: var(--shadow-color) 0 8px 32px;
        }
    `;

    const prevStyle = document.getElementById('theme-style');
    if (prevStyle) prevStyle.remove();

    style.id = 'theme-style';
    document.head.appendChild(style);
};

const applyTheme = (themeName) => {
    if (!themeName || themeName === 'revert' || themeName === 'nineSeries' || themeName === 'wmp10' || themeName === 'default') {
        themeName = 'auroraBreeze';
    }
    let theme = themes[themeName];
    if (!theme) {
        console.warn(`Theme "${themeName}" not found. Falling back to auroraBreeze.`);
        theme = themes.auroraBreeze || themes.default;
        themeName = 'auroraBreeze';
    }

    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.setAttribute('data-theme', themeName);
        if (document.body) {
            document.body.setAttribute('data-theme', themeName);
        }
        Object.entries(theme).forEach(([property, value]) => {
            if (typeof value === 'string' && property !== 'name') {
                root.style.setProperty(`--${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
            }
        });
        injectAdvancedCSS(theme);
    }
    store.set('selected-theme', themeName);
};

const getCurrentTheme = () => {
    const saved = store.get('selected-theme');
    if (!saved || saved === 'default' || saved === 'revert' || saved === 'nineSeries' || saved === 'wmp10') {
        return 'auroraBreeze';
    }
    if (!themes[saved]) {
        return 'auroraBreeze';
    }
    return saved;
};

module.exports = { themes, applyTheme, getCurrentTheme };

export {};
