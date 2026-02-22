# Miaoda Welcome

Welcome experience for Miaoda IDE with language selection.

## Features

- Beautiful language selection interface on first startup
- Support for English, Chinese (Simplified), and Japanese
- Automatic language application with restart prompt
- Can be manually triggered via command palette

## Usage

### First Startup

When you first launch Miaoda IDE, you'll be greeted with a beautiful language selection screen. Choose your preferred language:

- 🇺🇸 English
- 🇨🇳 中文（简体）
- 🇯🇵 日本語

Click "Continue" and restart the IDE to apply your language choice.

### Manual Language Selection

You can change the language at any time:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Miaoda: Select Display Language"
3. Choose your preferred language
4. Restart the IDE

## Design

The language selector features:

- Modern gradient background (Miaoda brand colors)
- Smooth animations and transitions
- Responsive design for all screen sizes
- Glassmorphism effect with backdrop blur
- Interactive card selection with visual feedback

## Configuration

The extension stores your language selection preference in:

```json
{
  "miaoda.welcome.languageSelected": true
}
```

To see the welcome screen again, set this to `false` in your settings.

## License

MIT
