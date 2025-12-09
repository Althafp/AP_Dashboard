# 🗺️ GOOGLE MAPS SETUP GUIDE

## ✅ Map Feature Added!

I've added an interactive Andhra Pradesh map below the main dashboard!

---

## 🚀 Quick Setup:

### **Step 1: Create `.env` File**

In the root directory (`C:\chndu\EMS_Gashboard`), create a file named `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Replace `YOUR_ACTUAL_API_KEY_HERE` with your real Google Maps API key!**

### **Step 2: Restart Dev Server**

After creating `.env`:
```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

---

## 📋 What You'll See:

### **Map Features:**
- ✅ **13 Districts** of Andhra Pradesh marked
- ✅ **Hover** over district → Green highlight
- ✅ **Click** district → Purple highlight + Zoom
- ✅ **Reset View** button to return to full state
- ✅ **Selected district** indicator

### **Districts Included:**
1. Anantapur
2. Chittoor
3. East Godavari
4. Guntur
5. Kadapa
6. Krishna
7. Kurnool
8. Nellore
9. Prakasam
10. Srikakulam
11. Visakhapatnam
12. Vizianagaram
13. West Godavari

---

## 🎯 Map Location:

The map appears **below the 4 category cards** on Main Dashboard:

```
┌─────────────────────────────┐
│  Main Dashboard            │
│  [4 Category Cards]        │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  🗺️ Andhra Pradesh Map      │
│  [Interactive Map]          │
└─────────────────────────────┘
```

---

## 🔑 Google Maps API Setup:

### **1. Get API Key:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a project (or select existing)
- Enable **Maps JavaScript API**
- Create API key
- Copy the key

### **2. Add to `.env`:**
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### **3. Restart Server:**
```bash
npm run dev
```

---

## 🎨 Map Interactions:

| Action | Result |
|--------|--------|
| **Hover** over district | Green highlight, marker grows |
| **Click** district | Purple highlight, zoom to district |
| **Click Reset** | Return to full state view |
| **Hover away** | Returns to normal (if not selected) |

---

## 📁 Files Created:

1. ✅ `src/components/AndhraPradeshMap.tsx` - Map component
2. ✅ `src/types/google-maps.d.ts` - TypeScript types
3. ✅ `@types/google.maps` - Installed package

---

## 🎊 DONE!

**Just add your API key to `.env` and refresh!**

The map will show all Andhra Pradesh districts with full interactivity! 🗺️🎉

---

## 💡 Future Enhancements (Optional):

You can extend this with:
- District-specific monitor counts
- Click district → Filter monitors by district
- District boundaries (polygons)
- Heat maps for monitor density
- Custom icons per district type

---

**Map is ready! Add your API key and enjoy!** 🚀

