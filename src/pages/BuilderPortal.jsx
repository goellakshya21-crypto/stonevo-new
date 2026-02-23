import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Ruler, MapPin, Tag, Package, Trash2, ArrowRight, LayoutGrid, FileText, Plus, Activity } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import StoneSelectionForm from '../components/StoneSelectionForm';

const SYNTHETIC_LOTS = [
    { id: 'syn-1', name: 'Statuario Extra Premium', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '1250', lot_size_sqft: 1850, vendor_address: 'Kishangarh, Rajasthan', description: 'Rare extra-white Statuario with bold dramatic veining.', color: 'White', type: 'Italian Marble', variation: 'High', brightness: 95, luminous_grade: 98, quarry: 'Carrara, Italy' },
    { id: 'syn-2', name: 'Calacatta Gold Select', image_url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&q=80&w=800', price_range: '950', lot_size_sqft: 1200, vendor_address: 'Makrana Heritage Block', description: 'Classic Calacatta with warm gold undertones.', color: 'Golden White', type: 'Italian Marble', variation: 'Medium', brightness: 90, luminous_grade: 92, quarry: 'Vagli, Italy' },
    { id: 'syn-3', name: 'Armani Grey Luxury', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800', price_range: '450', lot_size_sqft: 2400, vendor_address: 'Silvassa Processing Unit', description: 'Sophisticated grey marble with a velvet finish.', color: 'Grey', type: 'Natural Stone', variation: 'Low', brightness: 80, luminous_grade: 75, quarry: 'Iran Premium' },
    { id: 'syn-4', name: 'Michaelangelo White', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '850', lot_size_sqft: 950, vendor_address: 'Bangalore Export Hub', description: 'Artistic white marble with painterly grey swirls.', color: 'White/Grey', type: 'Premium Marble', variation: 'High', brightness: 88, luminous_grade: 85, quarry: 'Makrana, India' },
    { id: 'syn-5', name: 'Nero Marquina Classic', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '380', lot_size_sqft: 3100, vendor_address: 'Spain Imported Stock', description: 'Deep black marble with striking white lightning veins.', color: 'Black', type: 'Spanish Marble', variation: 'Medium', brightness: 10, luminous_grade: 15, quarry: 'Spain' },
    { id: 'syn-6', name: 'Botoccino Royal', image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', price_range: '320', lot_size_sqft: 4500, vendor_address: 'Italy Direct Import', description: 'Creamy beige marble with subtle earth tones.', color: 'Beige', type: 'Italian Marble', variation: 'Low', brightness: 85, luminous_grade: 80, quarry: 'Italy' },
    { id: 'syn-7', name: 'Blue Pearl Granite', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '550', lot_size_sqft: 1500, vendor_address: 'Norway Premium Quarries', description: 'Stunning blue crystals embedded in a dark matrix.', color: 'Blue/Grey', type: 'Granite', variation: 'Medium', brightness: 60, luminous_grade: 65, quarry: 'Norway' },
    { id: 'syn-8', name: 'Alaska White Granite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '280', lot_size_sqft: 2800, vendor_address: 'Brazil Sourced Lot', description: 'Frosty white background with translucent quartz fragments.', color: 'White/Silver', type: 'Granite', variation: 'High', brightness: 82, luminous_grade: 80, quarry: 'Brazil' },
    { id: 'syn-9', name: 'Rosso Verona', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', price_range: '420', lot_size_sqft: 1100, vendor_address: 'Verona, Italy', description: 'Warm reddish-orange marble with historical charm.', color: 'Red', type: 'Italian Marble', variation: 'Medium', brightness: 40, luminous_grade: 35, quarry: 'Italy' },
    { id: 'syn-10', name: 'Amazonite Quartzite', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?auto=format&fit=crop&q=80&w=800', price_range: '1800', lot_size_sqft: 650, vendor_address: 'Brazil Exotic Gallery', description: 'Crystal-clear turquoise quartzite with intense color.', color: 'Turquoise', type: 'Exotic Quartzite', variation: 'Extreme', brightness: 75, luminous_grade: 85, quarry: 'Brazil' },
    { id: 'syn-11', name: 'Silver Travertine', image_url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&q=80&w=800', price_range: '260', lot_size_sqft: 3500, vendor_address: 'Turkey Direct Lot', description: 'Porous linear texture in cool silver-grey tones.', color: 'Grey', type: 'Travertine', variation: 'Medium', brightness: 70, luminous_grade: 68, quarry: 'Turkey' },
    { id: 'syn-12', name: 'Crema Marfil Premium', image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', price_range: '340', lot_size_sqft: 4200, vendor_address: 'Alicante, Spain', description: 'The gold standard of beige marble.', color: 'Beige', type: 'Spanish Marble', variation: 'Low', brightness: 88, luminous_grade: 85, quarry: 'Spain' },
    { id: 'syn-13', name: 'Emerald Quartzite', image_url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800', price_range: '1550', lot_size_sqft: 800, vendor_address: 'Madagascar Exotic', description: 'Deep green quartzite with translucent floral patterns.', color: 'Green', type: 'Quartzite', variation: 'High', brightness: 50, luminous_grade: 60, quarry: 'Madagascar' },
    { id: 'syn-14', name: 'Breccia Pontificia', image_url: 'https://images.unsplash.com/photo-1600607687940-c52fc0473127?auto=format&fit=crop&q=80&w=800', price_range: '680', lot_size_sqft: 1400, vendor_address: 'Rome Premium Selection', description: 'Bold fragments of purple, red, and gold in a complex matrix.', color: 'Multi', type: 'Italian Marble', variation: 'Extreme', brightness: 45, luminous_grade: 48, quarry: 'Italy' },
    { id: 'syn-15', name: 'Bianco Lasa Vena Oro', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '1400', lot_size_sqft: 1200, vendor_address: 'Tirol Alps Stock', description: 'Pristine white alpine marble with subtle gold threads.', color: 'White', type: 'Austrian Marble', variation: 'Medium', brightness: 97, luminous_grade: 99, quarry: 'Austria' },
    { id: 'syn-16', name: 'Grigio Carnico', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '480', lot_size_sqft: 2100, vendor_address: 'Northern Italy Import', description: 'Charcoal grey marble with thick white linear veins.', color: 'Dark Grey', type: 'Italian Marble', variation: 'High', brightness: 30, luminous_grade: 35, quarry: 'Italy' },
    { id: 'syn-17', name: 'Ocean Blue Onyx', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?auto=format&fit=crop&q=80&w=800', price_range: '2200', lot_size_sqft: 400, vendor_address: 'Iran Backlit Gallery', description: 'Highly translucent blue onyx with circular banding.', color: 'Blue/Gold', type: 'Onyx', variation: 'Extreme', brightness: 80, luminous_grade: 95, quarry: 'Iran' },
    { id: 'syn-18', name: 'Black Fusion Quartzite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '1150', lot_size_sqft: 1600, vendor_address: 'Brazil Premium Hub', description: 'Vibrant waves of gold and white over a cosmic black background.', color: 'Black/Gold', type: 'Quartzite', variation: 'Extreme', brightness: 25, luminous_grade: 30, quarry: 'Brazil' },
    { id: 'syn-19', name: 'Panda White Marble', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '750', lot_size_sqft: 1350, vendor_address: 'China Signature Slab', description: 'High contrast black ink-like veins on snow white marble.', color: 'Black & White', type: 'Asian Marble', variation: 'Extreme', brightness: 90, luminous_grade: 95, quarry: 'Asia' },
    { id: 'syn-20', name: 'Palissandro Blue', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '920', lot_size_sqft: 1900, vendor_address: 'Italy Designer Series', description: 'Unique shimmering blue-grey marble with metallic mica.', color: 'Blue/Beige', type: 'Italian Marble', variation: 'High', brightness: 72, luminous_grade: 78, quarry: 'Italy' },
    { id: 'syn-21', name: 'Arabescato Vagli', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '880', lot_size_sqft: 1100, vendor_address: 'Tuscany Selection', description: 'Grey rounded ovules on a bright white background.', color: 'White', type: 'Italian Marble', variation: 'High', brightness: 92, luminous_grade: 94, quarry: 'Italy' },
    { id: 'syn-22', name: 'Forest Green Marble', image_url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800', price_range: '180', lot_size_sqft: 5500, vendor_address: 'Rajasthan Green Belt', description: 'Intense green marble with dark leafy networks.', color: 'Green', type: 'Indian Marble', variation: 'Medium', brightness: 40, luminous_grade: 42, quarry: 'India' },
    { id: 'syn-23', name: 'Persian Silver Travertine', image_url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&q=80&w=800', price_range: '240', lot_size_sqft: 3800, vendor_address: 'Iran Import Lot', description: 'Luxurious silver-grey travertine with a sleek straight vein.', color: 'Silver', type: 'Travertine', variation: 'Medium', brightness: 65, luminous_grade: 70, quarry: 'Iran' },
    { id: 'syn-24', name: 'Desert Gold Granite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '190', lot_size_sqft: 6000, vendor_address: 'Jaisalmer Hub', description: 'Warm sand-colored granite with fine consistent grains.', color: 'Gold/Beige', type: 'Granite', variation: 'Low', brightness: 78, luminous_grade: 75, quarry: 'India' },
    { id: 'syn-25', name: 'Iceberg Quartzite', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '1650', lot_size_sqft: 750, vendor_address: 'Brazil Crystal Yard', description: 'Luminous translucent quartzite that mimics frozen ice.', color: 'Icy White', type: 'Quartzite', variation: 'Medium', brightness: 95, luminous_grade: 98, quarry: 'Brazil' },
    { id: 'syn-26', name: 'Golden Portoro', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '3500', lot_size_sqft: 350, vendor_address: 'La Spezia, Italy', description: 'The worlds most expensive black marble with gold veins.', color: 'Black/Gold', type: 'Italian Marble', variation: 'High', brightness: 15, luminous_grade: 20, quarry: 'Italy' },
    { id: 'syn-27', name: 'Azul Macaubas', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '2800', lot_size_sqft: 500, vendor_address: 'Brazil Exotic Stock', description: 'True natural blue quartzite with sky-colored flows.', color: 'Bright Blue', type: 'Quartzite', variation: 'High', brightness: 68, luminous_grade: 72, quarry: 'Brazil' },
    { id: 'syn-28', name: 'Sequoia Brown Marble', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', price_range: '580', lot_size_sqft: 2200, vendor_address: 'Brazil Import Slab', description: 'Dramatic linear brown marble resembling tree rings.', color: 'Brown', type: 'Semi-Exotic Marble', variation: 'High', brightness: 35, luminous_grade: 40, quarry: 'Brazil' },
    { id: 'syn-29', name: 'Bianco Carrara CD', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '320', lot_size_sqft: 8000, vendor_address: 'Carrara, Italy', description: 'Classic grey-veined white marble for large projects.', color: 'Off-White', type: 'Italian Marble', variation: 'Medium', brightness: 85, luminous_grade: 82, quarry: 'Italy' },
    { id: 'syn-30', name: 'Volakas White Marble', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '450', lot_size_sqft: 3200, vendor_address: 'Drama, Greece', description: 'Soft diagonal grey and taupe veins on white.', color: 'White', type: 'Greek Marble', variation: 'Medium', brightness: 90, luminous_grade: 88, quarry: 'Greece' },
    { id: 'syn-31', name: 'Lemurian Blue Granite', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '1950', lot_size_sqft: 600, vendor_address: 'Madagascar Gallery', description: 'Labradorite granite with electric blue glowing spots.', color: 'Dark Blue', type: 'Exotic Granite', variation: 'Extreme', brightness: 40, luminous_grade: 45, quarry: 'Madagascar' },
    { id: 'syn-32', name: 'Fantasy Brown Marble', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800', price_range: '240', lot_size_sqft: 5000, vendor_address: 'Rajasthan Export Lot', description: 'flowing waves of brown, grey and white.', color: 'Brown/Grey', type: 'Indian Marble', variation: 'High', brightness: 75, luminous_grade: 78, quarry: 'India' },
    { id: 'syn-33', name: 'Noir Saint Laurent', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '1100', lot_size_sqft: 1100, vendor_address: 'France Premium Stock', description: 'Black marble with copper and white lightning veins.', color: 'Black/Orange', type: 'French Marble', variation: 'High', brightness: 20, luminous_grade: 25, quarry: 'France' },
    { id: 'syn-34', name: 'Sky Blue Onyx', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?auto=format&fit=crop&q=80&w=800', price_range: '2600', lot_size_sqft: 300, vendor_address: 'Mexico Exotic Import', description: 'Ethereal blue onyx with soft white clouds.', color: 'Light Blue', type: 'Onyx', variation: 'High', brightness: 85, luminous_grade: 92, quarry: 'Mexico' },
    { id: 'syn-35', name: 'Sodality Blue', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800', price_range: '4500', lot_size_sqft: 200, vendor_address: 'Bolivia Boutique', description: 'Royal blue gemstone-quality marble with white veins.', color: 'Deep Blue', type: 'Gemstone Marble', variation: 'Medium', brightness: 30, luminous_grade: 35, quarry: 'Bolivia' },
    { id: 'syn-36', name: 'Cippolino Ondulato', image_url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800', price_range: '1350', lot_size_sqft: 900, vendor_address: 'Italy Toscana Lot', description: 'Intense wavy green and purple marble texture.', color: 'Green/Purple', type: 'Italian Marble', variation: 'Extreme', brightness: 55, luminous_grade: 58, quarry: 'Italy' },
    { id: 'syn-37', name: 'Nero Portoro Silver', image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', price_range: '1850', lot_size_sqft: 700, vendor_address: 'Italy Custom Slab', description: 'Rare silver-veined variant of the Portoro marble.', color: 'Black/Silver', type: 'Italian Marble', variation: 'High', brightness: 22, luminous_grade: 25, quarry: 'Italy' },
    { id: 'syn-38', name: 'Pink Onyx Bubble', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?auto=format&fit=crop&q=80&w=800', price_range: '1900', lot_size_sqft: 500, vendor_address: 'Iran Import Hub', description: 'Sweet rose-pink onyx with circular mineral bubbles.', color: 'Pink', type: 'Onyx', variation: 'High', brightness: 82, luminous_grade: 88, quarry: 'Iran' },
    { id: 'syn-39', name: 'Fusion Wow Quartzite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '2100', lot_size_sqft: 650, vendor_address: 'Brazil Gallery Select', description: 'Multi-color quartzite with orange, green and blue swirls.', color: 'Rainbow', type: 'Exotic Quartzite', variation: 'Extreme', brightness: 60, luminous_grade: 65, quarry: 'Brazil' },
    { id: 'syn-40', name: 'Grigio Orobico', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '780', lot_size_sqft: 1400, vendor_address: 'Italy Bergamo Stock', description: 'Grey marble with complex gold and white patterns.', color: 'Grey/Gold', type: 'Italian Marble', variation: 'Extreme', brightness: 45, luminous_grade: 48, quarry: 'Italy' },
    { id: 'syn-41', name: 'Bianco Superiore', image_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=800', price_range: '1650', lot_size_sqft: 850, vendor_address: 'Brazil Quartzite Hub', description: 'Whiter than marble, harder than granite. Pure quartzite.', color: 'Flash White', type: 'Quartzite', variation: 'Low', brightness: 98, luminous_grade: 100, quarry: 'Brazil' },
    { id: 'syn-42', name: 'Titanium Black Granite', image_url: 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&q=80&w=800', price_range: '650', lot_size_sqft: 2000, vendor_address: 'Brazil Sourced Slab', description: 'Deep black granite with silver and gold quartz waves.', color: 'Black/Silver', type: 'Granite', variation: 'High', brightness: 25, luminous_grade: 28, quarry: 'Brazil' },
    { id: 'syn-43', name: 'Violet Bamboo Marble', image_url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800', price_range: '950', lot_size_sqft: 1200, vendor_address: 'China Specialty Lot', description: 'Linear structural veins in shades of violet and grey.', color: 'Purple/Grey', type: 'Exotic Marble', variation: 'High', brightness: 50, luminous_grade: 55, quarry: 'China' },
    { id: 'syn-44', name: 'Travertino Navona', image_url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&q=80&w=800', price_range: '380', lot_size_sqft: 3600, vendor_address: 'Rome Premium Quarry', description: 'Light cream travertine with dense uniform structure.', color: 'Cream', type: 'Italian Travertine', variation: 'Low', brightness: 82, luminous_grade: 80, quarry: 'Italy' },
    { id: 'syn-45', name: 'Imperial Red Granite', image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', price_range: '150', lot_size_sqft: 9000, vendor_address: 'Jhansi, India', description: 'Consistent Ruby red granite for monumental projects.', color: 'Deep Red', type: 'Indian Granite', variation: 'Low', brightness: 30, luminous_grade: 25, quarry: 'India' },
    { id: 'syn-46', name: 'Labradorite Lemurian', image_url: 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?auto=format&fit=crop&q=80&w=800', price_range: '3200', lot_size_sqft: 450, vendor_address: 'Madagascar Premium', description: 'Highest grade peacock-eye crystals on dark base.', color: 'Peacock Blue', type: 'Exotic Stone', variation: 'Extreme', brightness: 45, luminous_grade: 50, quarry: 'Madagascar' },
    { id: 'syn-47', name: 'Arabescato Orobico', image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800', price_range: '840', lot_size_sqft: 1300, vendor_address: 'Italy Custom Hub', description: 'Wild grey and gold veins in a swirl pattern.', color: 'Dark Grey/Gold', type: 'Italian Marble', variation: 'Extreme', brightness: 40, luminous_grade: 42, quarry: 'Italy' },
    { id: 'syn-48', name: 'Vanilla Quartzite', image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800', price_range: '1250', lot_size_sqft: 1100, vendor_address: 'Brazil Import Slab', description: 'Soft creamy white quartzite with silk texture.', color: 'Cream White', type: 'Quartzite', variation: 'Low', brightness: 92, luminous_grade: 95, quarry: 'Brazil' },
    { id: 'syn-49', name: 'Verde Alpi Premium', image_url: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800', price_range: '620', lot_size_sqft: 1800, vendor_address: 'Italy Alps Import', description: 'Classic forest green marble with white lightning veining.', color: 'Dark Green', type: 'Italian Marble', variation: 'Medium', brightness: 35, luminous_grade: 38, quarry: 'Italy' },
    { id: 'syn-50', name: 'Pietra Grey Select', image_url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800', price_range: '290', lot_size_sqft: 4500, vendor_address: 'Iran Main Lot', description: 'Graphite grey marble with slender white veins.', color: 'Graphite Grey', type: 'Semi-Italian Marble', variation: 'Low', brightness: 40, luminous_grade: 45, quarry: 'Iran' }
];

const BuilderPortal = () => {
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [projectRequirements, setProjectRequirements] = useState(null);

    useEffect(() => {
        fetchSmallLots();
        fetchProjectRequirements();
    }, []);

    const fetchProjectRequirements = async () => {
        const leadId = localStorage.getItem('stonevo_lead_id');
        if (!leadId) return;

        try {
            const { data, error } = await supabase
                .from('project_requirements')
                .select('*')
                .eq('lead_id', leadId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setProjectRequirements(data.data);
            }
        } catch (err) {
            console.error('Error fetching project requirements:', err);
        }
    };

    const handleSaveRequirements = async (data) => {
        const leadId = localStorage.getItem('stonevo_lead_id');
        if (!leadId) {
            alert("Error: No active lead session found.");
            return;
        }

        // Calculate total area for database optimization
        const totalArea = data.reduce((acc, floor) => {
            return acc + floor.rooms.reduce((rAcc, room) => {
                return rAcc + room.stones.reduce((sAcc, stone) => {
                    return sAcc + (Number(stone.area) || 0);
                }, 0);
            }, 0);
        }, 0);

        try {
            const { error } = await supabase
                .from('project_requirements')
                .upsert({
                    lead_id: leadId,
                    data: data,
                    total_area: totalArea,
                    status: 'draft',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'lead_id' });

            if (error) throw error;

            setProjectRequirements(data);
            alert("Draft saved successfully to our institutional database.");
            setIsConfiguratorOpen(false);
        } catch (err) {
            console.error('Error saving requirements:', err);
            alert(`Save failed: ${err.message}. Please ensured the database table exists.`);
        }
    };

    const fetchSmallLots = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stones')
                .select('*')
                .eq('lot_type', 'small_lot')
                .order('created_at', { ascending: false });

            if (error) throw error;
            // Merge live data with synthetic data
            setLots([...(data || []), ...SYNTHETIC_LOTS]);
        } catch (err) {
            console.error('Error fetching small lots:', err);
            // Fallback to only synthetic data if Supabase fails
            setLots(SYNTHETIC_LOTS);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (lot) => {
        if (!cart.find(item => item.id === lot.id)) {
            setCart([...cart, lot]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const totalVolume = cart.reduce((sum, item) => sum + (Number(item.lot_size_sqft) || 0), 0);

    const [activeFilter, setActiveFilter] = useState('All');
    const filters = ['All', 'Veined', 'Uniform', 'Granular', 'Exotic'];

    const filteredLots = activeFilter === 'All'
        ? lots
        : lots.filter(lot => {
            if (activeFilter === 'Veined') return lot.variation === 'High' || lot.variation === 'Extreme';
            if (activeFilter === 'Uniform') return lot.variation === 'Low';
            if (activeFilter === 'Granular') return lot.type === 'Granite';
            if (activeFilter === 'Exotic') return lot.type.includes('Exotic') || lot.type.includes('Onyx');
            return true;
        });

    return (
        <div className="min-h-screen bg-[#070707] text-stone-200 font-sans selection:bg-bronze/30">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-soft-light bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>

            {/* Command Header */}
            <header className="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-[60]">
                <div className="flex items-center gap-12">
                    <div className="relative group cursor-pointer">
                        <h1 className="text-3xl font-serif italic text-[#eca413] tracking-tight">Stonevo Builder Hub</h1>
                        <div className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#eca413] transition-all group-hover:w-full"></div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500 mt-1 font-bold">Institutional Procurement</p>
                    </div>

                    <nav className="hidden xl:flex items-center gap-8 border-l border-white/10 pl-12">
                        {['Dashboard', 'Inventory', 'Analytics', 'Support'].map(item => (
                            <button key={item} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors">
                                {item}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-8">
                    {/* Glowing CTA */}
                    <button
                        onClick={() => setIsConfiguratorOpen(true)}
                        className="relative group px-10 py-3.5 bg-[#eca413] text-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,164,19,0.2)]"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <span className="relative flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-black">
                            <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                            Add Requirement
                        </span>
                    </button>

                    <div className="h-10 w-[1px] bg-white/10 mx-2"></div>

                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10">
                        <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Manifest Total</p>
                            <p className="text-sm font-mono text-[#eca413]">{totalVolume.toLocaleString()} SQ.FT</p>
                        </div>
                        <Package className="text-[#eca413] opacity-60" size={20} />
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
                {/* Left Sidebar: Filters */}
                <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-xl p-8 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
                    <section className="space-y-6">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#eca413] font-black flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#eca413] animate-pulse"></div>
                            Geological Filter
                        </h3>
                        <div className="flex flex-col gap-2">
                            {filters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`w-full px-5 py-3 rounded-xl text-left text-xs tracking-widest uppercase transition-all flex justify-between items-center group ${activeFilter === filter
                                        ? 'bg-[#eca413] text-black font-bold shadow-lg shadow-[#eca413]/10'
                                        : 'hover:bg-white/5 text-stone-500 hover:text-white'
                                        }`}
                                >
                                    {filter}
                                    <div className={`w-1 h-1 rounded-full ${activeFilter === filter ? 'bg-black' : 'bg-stone-700 group-hover:bg-[#eca413]'} transition-colors`}></div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-bold">Status Hub</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Immediate Delivery', icon: Package, count: 12 },
                                { label: 'Processing', icon: FileText, count: 8 },
                                { label: 'Archived Lots', icon: LayoutGrid, count: 45 }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3 text-stone-400 group-hover:text-white transition-colors">
                                        <item.icon size={14} />
                                        <span className="text-[10px] tracking-widest uppercase">{item.label}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-stone-600">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="mt-auto p-6 bg-gradient-to-br from-[#eca413]/10 to-transparent border border-[#eca413]/10 rounded-3xl space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-[#eca413] font-bold">Builder's Edge</p>
                        <p className="text-[11px] leading-relaxed text-stone-400 italic">"Combine high-variation lots for unique flooring signatures at 40% efficiency."</p>
                    </div>
                </aside>

                {/* Center Main: 3-Column Grid */}
                <main className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                    <div className="max-w-6xl mx-auto space-y-12">
                        <header className="flex justify-between items-end">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-serif italic text-white flex items-center gap-4">
                                    Strategic Inventory
                                    <span className="text-sm font-mono text-stone-500 not-italic align-middle h-6 px-3 bg-white/5 rounded-full flex items-center border border-white/10 uppercase tracking-widest">
                                        {filteredLots.length} OPPORTUNITIES
                                    </span>
                                </h2>
                                <p className="text-stone-500 text-xs tracking-[0.2em] uppercase">Verified Institutional Marble & Granite Stock</p>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                            <AnimatePresence mode='popLayout'>
                                {filteredLots.map((lot) => (
                                    <motion.div
                                        key={lot.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white/10 border border-white/10 rounded-[2rem] overflow-hidden group hover:border-[#eca413] transition-all duration-500 flex flex-col shadow-2xl hover:shadow-[#eca413]/5"
                                    >
                                        <div
                                            className="h-64 overflow-hidden cursor-zoom-in relative"
                                            onClick={() => setSelectedSlot(lot)}
                                        >
                                            <img src={lot.image_url} alt={lot.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />

                                            {/* Top Overlay Badge */}
                                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                                                <div className="p-1.5 bg-[#eca413]/20 rounded-lg">
                                                    <Tag size={14} className="text-[#eca413]" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">List Price</p>
                                                    <p className="text-xs font-mono font-black text-white">₹{lot.price_range}<span className="text-[9px] text-stone-400 font-normal">/SF</span></p>
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                                        </div>

                                        <div className="p-7 flex-1 flex flex-col justify-between space-y-6">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-serif italic text-2xl text-white group-hover:text-[#eca413] transition-colors">{lot.name}</h3>
                                                        <p className="text-[10px] text-[#eca413] uppercase tracking-[0.2em] mt-1 font-bold">{lot.type}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/5">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Lot Volume</p>
                                                        <p className="text-sm font-mono text-stone-200">{lot.lot_size_sqft} SQ.FT</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Quarry</p>
                                                        <p className="text-sm font-mono text-stone-200 truncate">{lot.quarry || 'Italy'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase tracking-widest text-stone-500 font-black mb-1">Luminous Grade</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#eca413] transition-all duration-1000"
                                                                style={{ width: `${lot.luminous_grade || 85}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-mono text-[#eca413]">{lot.luminous_grade || 85}%</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => addToCart(lot)}
                                                    disabled={cart.find(item => item.id === lot.id)}
                                                    className={`p-4 rounded-2xl transition-all ${cart.find(item => item.id === lot.id)
                                                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed shadow-none'
                                                        : 'bg-white text-black hover:bg-[#eca413] hover:text-black shadow-xl shadow-white/5 hover:shadow-[#eca413]/20'
                                                        }`}
                                                >
                                                    <ShoppingCart size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar: Building Manifest */}
                <aside className="w-[22rem] flex flex-col border-l border-white/5 bg-black/40 backdrop-blur-2xl">
                    <div className="p-8 border-b border-white/5">
                        <h2 className="text-xl font-serif italic text-white flex items-center gap-4">
                            Building Manifest
                            {cart.length > 0 && (
                                <span className="text-[10px] font-mono text-black bg-[#eca413] px-2 py-0.5 rounded-full">
                                    {cart.length}
                                </span>
                            )}
                        </h2>
                        <p className="text-[9px] uppercase tracking-widest text-stone-500 mt-2 font-black italic">Consolidated Procurement List</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                <div className="p-6 rounded-full border-2 border-dashed border-stone-600">
                                    <ShoppingCart size={32} className="text-stone-400" />
                                </div>
                                <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Manifest is Empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={item.id}
                                    className="p-5 bg-white/5 rounded-3xl border border-white/5 group relative overflow-hidden"
                                >
                                    <div className="flex gap-4 relative z-10">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-serif italic text-white">{item.name}</h4>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1 hover:text-red-400 text-stone-600 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-mono text-stone-500">{item.lot_size_sqft.toLocaleString()} SQ.FT</span>
                                                <span className="text-sm font-mono text-[#eca413]">₹{(Number(item.price_range) * Number(item.lot_size_sqft)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#eca413]/0 to-[#eca413]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    <div className="p-8 bg-black/60 border-t border-white/5 space-y-8">
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-black mb-1">Total Procurement</p>
                                    <p className="text-3xl font-mono text-white tracking-tighter">
                                        {totalVolume.toLocaleString()}
                                        <span className="text-xs text-stone-500 ml-2">SQ.FT</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end mb-1">
                                        <Activity size={12} className="text-[#eca413]" />
                                        <p className="text-[10px] uppercase tracking-widest text-[#eca413] font-black">Efficiency</p>
                                    </div>
                                    <p className="text-xl font-serif text-[#eca413] italic">~38% SAVINGS</p>
                                </div>
                            </div>

                            <button
                                disabled={cart.length === 0}
                                className="w-full py-5 bg-[#eca413] text-black rounded-[1.5rem] flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] font-black hover:bg-white transition-all disabled:opacity-20 disabled:grayscale group shadow-2xl shadow-[#eca413]/10"
                            >
                                Submit Intent to Procure
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            <StoneSelectionForm
                isOpen={isConfiguratorOpen}
                onClose={() => setIsConfiguratorOpen(false)}
                onSubmit={handleSaveRequirements}
                initialData={projectRequirements}
            />

            <ImageModal
                isOpen={!!selectedSlot}
                onClose={() => setSelectedSlot(null)}
                marble={selectedSlot ? {
                    name: selectedSlot.name,
                    imageUrl: selectedSlot.image_url,
                    description: selectedSlot.description,
                    physical_properties: {
                        color: selectedSlot.color,
                        priceRange: selectedSlot.price_range,
                        type: selectedSlot.type,
                        pattern: selectedSlot.variation,
                        brightness: selectedSlot.brightness
                    }
                } : null}
            />
        </div>
    );
};

export default BuilderPortal;
