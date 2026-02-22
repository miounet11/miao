# Miaoda Theme

**Next-generation IDE theme inspired by Cursor's modern design philosophy**

## 🎨 Design Philosophy

Miaoda Theme embodies the fusion of VSCode's familiarity with cutting-edge design principles:

- **Cursor-inspired color palette** - Modern gradient accents (#667EEA → #764BA2)
- **Information density** - Smaller fonts for better screen utilization
- **Next-gen buttons** - Gradient backgrounds with glow effects
- **Smooth animations** - Cubic-bezier transitions for premium feel
- **Clear visual hierarchy** - Users instantly recognize this as a next-generation tool

## 🌈 Themes Included

### Miaoda Dark (Recommended)
- Deep, focused background (#0F1419)
- Vibrant syntax highlighting
- Gradient accent colors
- Optimized for long coding sessions

### Miaoda Light
- Clean, bright interface
- High contrast for readability
- Professional appearance
- Perfect for daytime work

## ✨ Key Features

### 1. Modern Button Design
- Gradient backgrounds with hover effects
- Glow shadows for depth
- Smooth transitions
- Clear call-to-action styling

### 2. Compact UI
- **Editor**: 13px (vs default 14px)
- **Sidebar**: 12px
- **Status bar**: 11px
- **Tabs**: 32px height (vs default 35px)
- **Terminal**: 12px

### 3. Next-Gen Branding
- "NEXT-GEN AI IDE" badge in title bar
- Gradient logo effect
- Pulsing notification badges
- Modern scrollbars

### 4. Enhanced Visual Feedback
- Gradient selection highlights
- Smooth hover states
- Active border indicators
- Cursor glow effect

## 🎯 Color Palette

### Primary Colors
```
Primary Gradient: #667EEA → #764BA2
Background Dark:  #0F1419
Sidebar Dark:     #111827
Panel Dark:       #1F2937
```

### Semantic Colors
```
Success: #10B981 (Green)
Warning: #F59E0B (Amber)
Error:   #EF4444 (Red)
Info:    #3B82F6 (Blue)
```

### Syntax Highlighting
```
Keywords:  #C678DD (Purple)
Strings:   #98C379 (Green)
Functions: #61AFEF (Blue)
Classes:   #E06C75 (Red)
Variables: #E5C07B (Yellow)
Comments:  #6B7280 (Gray)
```

## 🚀 Installation

### Method 1: Built-in (Recommended)
Miaoda Theme is pre-installed with Miaoda IDE.

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Color Theme"
3. Select "Miaoda Dark" or "Miaoda Light"

### Method 2: Manual Installation
1. Copy `theme-miaoda` folder to `~/.vscode/extensions/`
2. Restart VSCode
3. Select theme from preferences

## 🎨 Customization

### Font Size Adjustments

If you prefer different font sizes, add to `settings.json`:

```json
{
  "editor.fontSize": 14,
  "terminal.integrated.fontSize": 13,
  "workbench.tree.fontSize": 13
}
```

### Custom Colors

Override specific colors:

```json
{
  "workbench.colorCustomizations": {
    "[Miaoda Dark]": {
      "editor.background": "#0A0E14",
      "activityBar.background": "#0A0E14"
    }
  }
}
```

### Disable Custom Styles

If you want standard VSCode styling:

```json
{
  "workbench.colorTheme": "Miaoda Dark",
  "miaoda.customStyles": false
}
```

## 🔧 Technical Details

### Files Structure
```
theme-miaoda/
├── package.json              # Extension manifest
├── themes/
│   ├── miaoda-dark.json     # Dark theme colors
│   └── miaoda-light.json    # Light theme colors
├── styles/
│   └── miaoda-custom.css    # Custom UI styles
└── README.md                 # This file
```

### CSS Customizations

The theme includes extensive CSS customizations:

- **Typography**: Optimized font sizes and weights
- **Buttons**: Gradient backgrounds with animations
- **Scrollbars**: Minimal, smooth design
- **Tabs**: Modern rounded corners
- **Activity Bar**: Gradient active indicators
- **Notifications**: Toast-style with top border
- **Context Menus**: Rounded corners with shadows

## 🎯 Design Principles

### 1. Information Density
Smaller fonts allow more code on screen without sacrificing readability.

### 2. Visual Hierarchy
Gradient accents guide attention to important elements:
- Active tabs
- Selected items
- Primary buttons
- Status indicators

### 3. Smooth Interactions
All transitions use `cubic-bezier(0.4, 0, 0.2, 1)` for natural motion.

### 4. Brand Identity
Consistent use of #667EEA → #764BA2 gradient reinforces "next-generation" positioning.

## 🌟 Comparison with Other Themes

### vs Default Dark+
- ✅ More modern color palette
- ✅ Better visual hierarchy
- ✅ Gradient accents
- ✅ Smaller, denser UI

### vs Cursor Theme
- ✅ Similar modern aesthetic
- ✅ Gradient button design
- ✅ Compact information density
- ✅ Smooth animations

### vs One Dark Pro
- ✅ More vibrant colors
- ✅ Better contrast ratios
- ✅ Modern UI elements
- ✅ Next-gen branding

## 📸 Screenshots

### Dark Theme
- Deep background for focus
- Vibrant syntax colors
- Gradient accents throughout
- Modern button styling

### Light Theme
- Clean, professional appearance
- High contrast for readability
- Subtle gradient accents
- Perfect for bright environments

## 🤝 Contributing

We welcome contributions to improve Miaoda Theme!

### Reporting Issues
- Color contrast problems
- Readability concerns
- Missing theme tokens
- UI inconsistencies

### Suggesting Improvements
- New color schemes
- Better syntax highlighting
- UI enhancements
- Accessibility improvements

## 📝 Changelog

### Version 1.0.0 (2026-02-21)
- 🎉 Initial release
- 🎨 Miaoda Dark theme
- ☀️ Miaoda Light theme
- 💅 Custom CSS styles
- 🔤 Optimized font sizes
- 🎯 Gradient button design
- ✨ Smooth animations
- 🏷️ Next-gen branding

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Credits

**Inspired by:**
- Cursor IDE - Modern design philosophy
- One Dark Pro - Color palette inspiration
- VSCode - Solid foundation
- Tailwind CSS - Color system

**Created by:**
Coco 🇨🇳 - Miaoda IDE Team

---

**Miaoda IDE** - Universal LLM Integration, Your Way

*Next-generation development environment powered by AI*
