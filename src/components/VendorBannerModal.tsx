import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import * as Icons from 'lucide-react-native';
import { useBannerStore } from '../store/bannerStore';
import { useThemeStore } from '../store/themeStore';

interface VendorBannerModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  { label: 'Food & Dining', key: 'Food', icon: 'Utensils', tag: 'FOOD & DINING', bg: '#0D0F17' },
  { label: 'Electronics & Tech', key: 'Products', icon: 'Smartphone', tag: 'ELECTRONICS & TECH', bg: '#0F172A' },
  { label: 'Stays & Hotels', key: 'Stay', icon: 'Bed', tag: 'LUXURY STAYS', bg: '#180E29' },
  { label: 'Daily Essentials', key: 'Daily Needs', icon: 'Milk', tag: 'DAILY ESSENTIALS', bg: '#0A1C16' },
  { label: 'Services & Repair', key: 'Services', icon: 'Wrench', tag: 'EXPERT SERVICES', bg: '#1E1B0E' },
];

const PRESET_IMAGES = [
  { name: 'Gourmet Food', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80' },
  { name: 'Tech & Laptops', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80' },
  { name: 'Resort & Stay', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=80' },
  { name: 'Groceries', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80' },
];

export default function VendorBannerModal({ visible, onClose }: VendorBannerModalProps) {
  const colors = useThemeStore((state) => state.colors);
  const addVendorBanner = useBannerStore((state) => state.addVendorBanner);

  const [vendorName, setVendorName] = useState('ABC Electronics Store');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('★ SPECIAL VENDOR OFFER');
  const [point1, setPoint1] = useState('100% Direct Vendor Guarantee');
  const [point2, setPoint2] = useState('Fast Doorstep Delivery');
  const [buttonText, setButtonText] = useState('EXPLORE OFFER');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [selectedImageUrl, setSelectedImageUrl] = useState(PRESET_IMAGES[1].url);

  const handleCreateBanner = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your vendor banner.');
      return;
    }

    const cat = CATEGORY_OPTIONS[selectedCategoryIdx];

    try {
      await addVendorBanner({
        vendorName: vendorName.trim() || 'Partner Vendor',
        title: title.trim(),
        subtitle: subtitle.trim() || `Special offer from ${vendorName}`,
        categoryTag: cat.tag,
        iconName: cat.icon,
        badgeText: badgeText.trim() || '★ VERIFIED VENDOR',
        points: [point1.trim() || 'Direct Vendor Pricing', point2.trim() || 'Verified Quality'],
        buttonText: buttonText.trim() || 'EXPLORE NOW',
        targetCategory: cat.key,
        image: selectedImageUrl,
        bgColor: cat.bg,
      });

      Alert.alert('Success 🎉', 'Your Vendor Banner has been published live to the App Home Screen!');
      setTitle('');
      setSubtitle('');
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to publish banner. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerTitleGroup}>
              <Icons.Store color="#F4C400" size={20} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Add Vendor Banner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icons.X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
              Publish a custom promotional banner to highlight your store's products, services, or discounts.
            </Text>

            {/* Vendor Name */}
            <Text style={[styles.label, { color: colors.text }]}>Store / Vendor Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={vendorName}
              onChangeText={setVendorName}
              placeholder="e.g. ABC Electronics"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Banner Title */}
            <Text style={[styles.label, { color: colors.text }]}>Banner Main Title *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Grand Festive Tech Sale 50% OFF"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Subtitle */}
            <Text style={[styles.label, { color: colors.text }]}>Subtitle / Short Description</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="e.g. Latest smartphones and accessories with official warranty"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Category Select */}
            <Text style={[styles.label, { color: colors.text }]}>Target Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORY_OPTIONS.map((cat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.catChip,
                    { borderColor: colors.border, backgroundColor: colors.cardBgSecondary },
                    selectedCategoryIdx === idx && styles.catChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategoryIdx(idx);
                    if (idx < PRESET_IMAGES.length) {
                      setSelectedImageUrl(PRESET_IMAGES[idx].url);
                    }
                  }}
                >
                  <Text style={[styles.catChipText, { color: colors.text }, selectedCategoryIdx === idx && styles.catChipTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Badge Text */}
            <Text style={[styles.label, { color: colors.text }]}>Badge Text</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={badgeText}
              onChangeText={setBadgeText}
              placeholder="★ VERIFIED STORE DISCOUNT"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Checklist Points */}
            <Text style={[styles.label, { color: colors.text }]}>Feature Highlights / Bullet Points</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, marginBottom: 8 }]}
              value={point1}
              onChangeText={setPoint1}
              placeholder="Point 1 (e.g., Direct Vendor Price)"
              placeholderTextColor={colors.placeholderText}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={point2}
              onChangeText={setPoint2}
              placeholder="Point 2 (e.g., Free Express Shipping)"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Button Text */}
            <Text style={[styles.label, { color: colors.text }]}>Button CTA Text</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
              value={buttonText}
              onChangeText={setButtonText}
              placeholder="e.g. CLAIM DISCOUNT"
              placeholderTextColor={colors.placeholderText}
            />

            {/* Image Preset Select */}
            <Text style={[styles.label, { color: colors.text }]}>Select Banner Cover Image</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {PRESET_IMAGES.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.imgPresetChip,
                    { borderColor: colors.border, backgroundColor: colors.cardBgSecondary },
                    selectedImageUrl === img.url && styles.imgPresetChipSelected,
                  ]}
                  onPress={() => setSelectedImageUrl(img.url)}
                >
                  <Text style={[styles.imgPresetText, { color: colors.text }, selectedImageUrl === img.url && styles.imgPresetTextSelected]}>
                    {img.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>

          {/* Submit Action */}
          <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={handleCreateBanner}>
            <Icons.PlusCircle color="#0D0F17" size={18} />
            <Text style={styles.submitBtnText}>Publish Vendor Banner Live</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: 'rgba(156, 163, 175, 0.8)',
    marginBottom: 14,
    lineHeight: 16,
  },
  formScroll: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  catChipSelected: {
    backgroundColor: '#F4C400',
    borderColor: '#F4C400',
  },
  catChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  catChipTextSelected: {
    color: '#0D0F17',
    fontWeight: 'bold',
  },
  imgPresetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imgPresetChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  imgPresetText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  imgPresetTextSelected: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#F4C400',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D0F17',
  },
});
