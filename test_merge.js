import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const toArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
const mergeArr = (a, b) => [...new Set([...toArr(a), ...toArr(b)])].filter(Boolean);

async function testMerge() {
    const { data: existingStone } = await supabase.from('stones').select('*').eq('name', 'Zenith Blue').maybeSingle();
    const resultData = { physical_properties: { application: existingStone.application } };
    const activeMapping = { category: 'application', value: 'Feature Wall' };
    const mappingMode = true;

    const existingProps = resultData.physical_properties || {};
    const enrichedResult = {
         name: 'Zenith Blue',
         physical_properties: {
             application: toArr(existingProps.application),
             [activeMapping.category]: mergeArr(existingProps[activeMapping.category], [activeMapping.value])
         }
    };

    const getMappingArr = (uiField) => mappingMode && activeMapping.category === uiField ? [activeMapping.value] : [];
    const payload = { application: mergeArr(mergeArr(enrichedResult.physical_properties?.application, existingStone?.application), getMappingArr('application')) };

    console.log("-------------------");
    console.log("PAYLOAD APP:", JSON.stringify(payload.application));
    console.log("-------------------");

    // Try dummy save with count to see if rows are actually updated
    const dbResponse = await supabase
         .from('stones')
         .update(payload)
         .eq('id', existingStone.id)
         .select(); // Ask Supabase to return the updated rows!
    
    console.log('Update Error?', dbResponse.error);
    console.log('Updated Rows Returned:', dbResponse.data);

}

testMerge();
