# Documentation Guide

Your go-to guide for navigating the project documentation.

---

## 📚 Documentation Files

### For Quick Overview
**[UPDATE_SUMMARY.md](./UPDATE_SUMMARY.md)** - Start here!
- What's new in this release
- High-level feature overview
- Quick code examples
- File organization
- Testing checklist

**Best for:** Getting up to speed quickly, understanding what changed

---

### For Using Indicators
**[INDICATOR_QUICK_START.md](./INDICATOR_QUICK_START.md)** - Practical guide
- Step-by-step usage examples
- All three indicators covered
- Multi-indicator integration
- Customization options
- Troubleshooting guide

**Best for:** Developers adding indicators to charts, learning by example

---

### For Technical Details
**[RELEASE_NOTES.md](./RELEASE_NOTES.md)** - Complete changelog
- Detailed feature descriptions
- Implementation specifics
- Performance optimizations
- Breaking changes (none!)
- Migration guide
- Bug fixes

**Best for:** Technical leads, code reviewers, understanding implementation details

---

### For Backend Developers
**[SECTORS_API_SPEC.md](./SECTORS_API_SPEC.md)** - API specification
- Three endpoint definitions
- Request/response formats
- Correlation calculation method
- Performance recommendations
- Testing checklist
- Data source options

**Best for:** Backend developers implementing the Sectors API

---

### For Patterns & Best Practices
**[CLAUDE.md](./CLAUDE.md)** - Living documentation (UPDATED)
- GenericPixiChart usage patterns
- Creating custom indicators
- Chart background patterns
- Drawing orders
- Established conventions

**Best for:** All developers, reference for patterns, creating custom components

---

## 🎯 Reading Path by Role

### Frontend Developer (Using Indicators)
1. **UPDATE_SUMMARY.md** - Get overview
2. **INDICATOR_QUICK_START.md** - Learn to use indicators
3. **CLAUDE.md** - Reference for advanced patterns

### Frontend Developer (Building Indicators)
1. **INDICATOR_QUICK_START.md** - See usage patterns
2. **CLAUDE.md** - "Creating Overlay Indicator Classes" section
3. **RELEASE_NOTES.md** - Implementation details
4. Review source files: `src/components/charts/drawFunctions/Draw*.js`

### Backend Developer
1. **UPDATE_SUMMARY.md** - Understand context
2. **SECTORS_API_SPEC.md** - Implement endpoints
3. Test with `src/components/SectorsPage.jsx`

### Technical Lead / Reviewer
1. **UPDATE_SUMMARY.md** - Quick overview
2. **RELEASE_NOTES.md** - Complete technical details
3. **INDICATOR_QUICK_START.md** - Verify developer experience
4. **SECTORS_API_SPEC.md** - Review API design

### New Team Member
1. **CLAUDE.md** - Learn established patterns
2. **UPDATE_SUMMARY.md** - See recent changes
3. **INDICATOR_QUICK_START.md** - Try examples
4. Explore source code with documentation as reference

---

## 🔍 Quick Find

### "How do I..."

| Task | Document | Section |
|------|----------|---------|
| Add moving averages to my chart | INDICATOR_QUICK_START.md | "Moving Averages" |
| Add SuperTrend indicator | INDICATOR_QUICK_START.md | "SuperTrend" |
| Add session range zones | INDICATOR_QUICK_START.md | "Session Range Zones" |
| Use multiple indicators together | INDICATOR_QUICK_START.md | "Multiple Indicators Example" |
| Create my own indicator | CLAUDE.md | "Creating Overlay Indicator Classes" |
| Implement Sectors API | SECTORS_API_SPEC.md | All sections |
| Customize indicator colors | INDICATOR_QUICK_START.md | Each indicator section |
| Understand the layer system | INDICATOR_QUICK_START.md | "Layer System" |
| Fix pan/zoom issues | INDICATOR_QUICK_START.md | "Troubleshooting" |

### "What is..."

| Concept | Document | Section |
|---------|----------|---------|
| DrawMovingAverages | RELEASE_NOTES.md | "DrawMovingAverages" |
| DrawSuperTrend | RELEASE_NOTES.md | "DrawSuperTrend" |
| DrawSessionRangeZones | RELEASE_NOTES.md | "DrawSessionRangeZones" |
| Market hours background | RELEASE_NOTES.md | "Market Hours Background Pattern" |
| Sectors page | RELEASE_NOTES.md | "Sectors Analysis Page" |
| DrawOrdersV2 enhancements | RELEASE_NOTES.md | "Enhanced Order Visualization" |
| Graphics object reuse pattern | CLAUDE.md | "Graphics Object Reuse" |
| Session pre-calculation | CLAUDE.md | "Performance Pattern: Session Pre-calculation" |

### "Why should I..."

| Question | Document | Section |
|----------|----------|---------|
| Use slicedData instead of ohlcData | CLAUDE.md | "Chart Indicators with GenericPixiChart" |
| Reuse Graphics objects | UPDATE_SUMMARY.md | "Key Patterns Established" |
| Pre-calculate indicators | RELEASE_NOTES.md | "Performance Optimizations" |
| Use refs for indicator instances | INDICATOR_QUICK_START.md | "Performance Tips" |
| Register draw functions | INDICATOR_QUICK_START.md | "Basic Pattern" |
| Use layers | INDICATOR_QUICK_START.md | "Layer System" |

---

## 📖 Documentation Standards

### For Contributors

When updating documentation:

1. **Update CLAUDE.md** for new patterns that should be standard
2. **Update RELEASE_NOTES.md** when adding features or fixing bugs
3. **Update INDICATOR_QUICK_START.md** when adding new indicators
4. **Update SECTORS_API_SPEC.md** if API changes
5. **Update this file (DOCS_README.md)** if adding new documentation

### Writing Style

- **UPDATE_SUMMARY.md**: Concise, high-level, emoji-friendly ✨
- **INDICATOR_QUICK_START.md**: Code-first, practical, example-heavy
- **RELEASE_NOTES.md**: Detailed, technical, comprehensive
- **SECTORS_API_SPEC.md**: Formal, precise, API-focused
- **CLAUDE.md**: Pattern-focused, explanatory, reference-style

---

## 🆕 Recent Updates

**January 2026:**
- Added comprehensive indicator documentation
- Created Sectors API specification
- Updated CLAUDE.md with new patterns
- Added this navigation guide

---

## 💡 Tips

### For Faster Learning
1. Start with code examples in INDICATOR_QUICK_START.md
2. Copy/paste and modify for your use case
3. Refer to CLAUDE.md when you need to understand "why"
4. Check RELEASE_NOTES.md for edge cases

### For Better Development
1. Follow patterns in CLAUDE.md - they're battle-tested
2. Use INDICATOR_QUICK_START.md as a reference card
3. Check "Troubleshooting" sections when stuck
4. Review source code of existing indicators

### For Code Reviews
1. Verify patterns match CLAUDE.md guidelines
2. Check for proper cleanup (see INDICATOR_QUICK_START.md)
3. Ensure Graphics objects are reused (not recreated)
4. Confirm slicedData is used for drawing

---

## 🔗 External Resources

**PIXI.js Documentation:**
- [PIXI.js API](https://pixijs.download/release/docs/index.html)
- [Graphics class](https://pixijs.download/release/docs/PIXI.Graphics.html)
- [Container class](https://pixijs.download/release/docs/PIXI.Container.html)

**React Patterns:**
- [useRef](https://react.dev/reference/react/useRef)
- [useEffect](https://react.dev/reference/react/useEffect)

---

## ✅ Quick Checklist

### Before Using Indicators
- [ ] Read UPDATE_SUMMARY.md overview
- [ ] Review INDICATOR_QUICK_START.md examples
- [ ] Have `GenericPixiChart` set up with `pixiDataRef`
- [ ] Understand the cleanup pattern

### Before Building Custom Indicators
- [ ] Read CLAUDE.md "Creating Overlay Indicator Classes"
- [ ] Review existing indicator source code
- [ ] Understand Graphics reuse pattern
- [ ] Know how to use slicedData

### Before Implementing Sectors API
- [ ] Read SECTORS_API_SPEC.md completely
- [ ] Understand correlation calculation
- [ ] Plan data source strategy
- [ ] Set up caching strategy

---

## 📝 Feedback

Documentation unclear? Found an error? Have a suggestion?

1. File an issue with the `documentation` label
2. Submit a PR with improvements
3. Ask in team chat

**Good documentation helps everyone!** 🚀
