# Miaoda IDE Theme Guide

## 🎨 Overview

Miaoda IDE features a custom theme system inspired by Cursor's modern design philosophy, combining:

- **Gradient accents** (#667EEA → #764BA2)
- **Compact UI** (smaller fonts for better information density)
- **Next-gen buttons** (gradient backgrounds with glow effects)
- **Smooth animations** (premium feel throughout)

## 🚀 Quick Start

### 1. Activate Theme

The Miaoda Dark theme is set as default. To change:

```
Cmd+Shift+P → "Color Theme" → Select "Miaoda Dark" or "Miaoda Light"
```

### 2. Apply Custom Styles

Custom CSS styles are auto-applied on startup. To manually apply:

```
Cmd+Shift+P → "Miaoda: Apply Custom Styles"
```

### 3. View Theme Info

```
Cmd+Shift+P → "Miaoda: Show Theme Info"
```

## 📐 Font Sizes

### Default Sizes (Optimized)

| Element | Size | Default VSCode |
|---------|------|----------------|
| Editor | 13px | 14px |
| Sidebar | 12px | 13px |
| Terminal | 12px | 13px |
| Status Bar | 11px | 12px |
| Tabs | 12px | 13px |
| Breadcrumbs | 11px | 12px |

### Customization

Edit `.vscode/settings.json`:

```json
{
  "editor.fontSize": 14,
  "terminal.integrated.fontSize": 13,
  "workbench.tree.fontSize": 13
}
```

## 🎯 Color Palette

### Primary Colors

```css
/* Gradient */
#667EEA → #764BA2

/* Backgrounds */
Editor:     #0F1419
Sidebar:    #111827
Panel:      #1F2937
Activity:   #0F1419
Status:     #0F1419
```

### Semantic Colors

```css
Success:  #10B981 (Green)
Warning:  #F59E0B (Amber)
Error:    #EF4444 (Red)
Info:     #3B82F6 (Blue)
```

### Syntax Highlighting

```css
Keywords:   #C678DD (Purple)
Strings:    #98C379 (Green)
Functions:  #61AFEF (Blue)
Classes:    #E06C75 (Red)
Variables:  #E5C07B (Yellow)
Comments:   #6B7280 (Gray)
```

## 🎨 UI Components

### Buttons

**Primary Button:**
- Gradient background (#667EEA → #764BA2)
- Glow shadow on hover
- Smooth scale animation
- Uppercase text with letter-spacing

**Secondary Button:**
- Subtle gray background
- Border on hover
- No gradient

### Activity Bar

- Vertical gradient indicator for active item
- Gradient badge backgrounds
- Smooth hover transitions

### Tabs

- Top gradient border for active tab
- Rounded corners
- Smooth background transitions
- Modern close button with red hover

### Scrollbars

- Minimal design
- Gradient on hover/active
- Rounded corners
- Smooth transitions

## 🔧 Advanced Customization

### Override Theme Colors

Add to `settings.json`:

```json
{
  "workbench.colorCustomizations": {
    "[Miaoda Dark]": {
      "editor.background": "#0A0E14",
      "activityBar.background": "#0A0E14",
      "sideBar.background": "#0D1117"
    }
  }
}
```

### Disable Custom Styles

```json
{
  "miaoda.customStyles": false,
  "miaoda.autoApplyCustomStyles": false
}
```

### Custom Font

```json
{
  "editor.fontFamily": "'Fira Code', 'JetBrains Mono', monospace",
  "editor.fontLigatures": true
}
```

## 🌟 Design Principles

### 1. Information Density

Smaller fonts allow more code on screen without sacrificing readability.

**Benefits:**
- See more code at once
- Reduce scrolling
- Better overview of file structure
- Professional appearance

### 2. Visual Hierarchy

Gradient accents guide attention:

- **Active elements**: Full gradient
- **Hover states**: Subtle gradient
- **Inactive elements**: Gray tones
- **Focus indicators**: Gradient borders

### 3. Smooth Interactions

All transitions use `cubic-bezier(0.4, 0, 0.2, 1)`:

- Natural motion
- Premium feel
- Consistent timing
- Hardware-accelerated

### 4. Brand Identity

**"Next-Generation" Positioning:**

- Badge in title bar
- Gradient logo effect
- Modern button design
- Pulsing notifications

## 📱 Platform-Specific

### macOS

```json
{
  "window.titleBarStyle": "custom",
  "window.nativeTabs": false,
  "editor.fontFamily": "'SF Mono', Monaco, Menlo"
}
```

### Windows

```json
{
  "window.titleBarStyle": "custom",
  "editor.fontFamily": "'Cascadia Code', Consolas"
}
```

### Linux

```json
{
  "window.titleBarStyle": "custom",
  "editor.fontFamily": "'Fira Code', 'Ubuntu Mono'"
}
```

## 🐛 Troubleshooting

### Theme Not Applied

1. Check current theme: `Cmd+K Cmd+T`
2. Select "Miaoda Dark" or "Miaoda Light"
3. Restart IDE if needed

### Custom Styles Not Working

1. Run: `Miaoda: Apply Custom Styles`
2. Check setting: `miaoda.customStyles: true`
3. Restart IDE

### Fonts Too Small

```json
{
  "editor.fontSize": 14,
  "terminal.integrated.fontSize": 13
}
```

### Gradient Not Visible

Check display settings:
- Color depth: 24-bit or higher
- Color profile: sRGB or Display P3

## 🎓 Best Practices

### For Long Coding Sessions

- Use **Miaoda Dark** theme
- Enable smooth scrolling
- Use cursor smooth animation
- Enable bracket pair colorization

### For Presentations

- Use **Miaoda Light** theme
- Increase font size to 16px
- Disable minimap
- Use zen mode (`Cmd+K Z`)

### For Pair Programming

- Use **Miaoda Dark** theme
- Font size: 14-15px
- Enable line numbers
- Show whitespace characters

## 📚 Resources

- **Theme Files**: `/extensions/theme-miaoda/themes/`
- **Custom CSS**: `/extensions/theme-miaoda/styles/miaoda-custom.css`
- **Extension**: `/extensions/theme-miaoda/extension.js`
- **Settings**: `/.vscode/settings.json`

## 🤝 Contributing

To improve the theme:

1. Edit theme files in `/extensions/theme-miaoda/`
2. Test changes
3. Submit feedback

## 📝 Changelog

### v1.0.0 (2026-02-21)

- 🎉 Initial release
- 🎨 Miaoda Dark theme
- ☀️ Miaoda Light theme
- 💅 Custom CSS styles
- 🔤 Optimized font sizes
- 🎯 Gradient button design
- ✨ Smooth animations
- 🏷️ Next-gen branding

---

**Miaoda IDE** - Universal LLM Integration, Your Way

*Next-generation development environment powered by AI*
