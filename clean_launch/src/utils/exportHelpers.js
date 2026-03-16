const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportToJSON = (results) => {
    const exportData = results.map(r => ({
        fileName: r.fileName,
        success: r.success,
        ...(r.success ? { data: r.data } : { error: r.error })
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, `marble-analysis-${Date.now()}.json`);
};

export const exportRawData = (data, filename) => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadBlob(blob, `${filename}-${Date.now()}.json`);
};

export const exportToCSV = (results) => {
    const headers = ['File Name', 'Status', 'Name', 'Type', 'Color', 'Pattern', 'Brightness', 'Price Range', 'Description', 'Tags'];

    const rows = results.map(r => {
        if (!r.success) {
            return [r.fileName, 'ERROR', '', '', '', '', '', '', r.error, ''];
        }

        return [
            r.fileName,
            'SUCCESS',
            r.data.name,
            r.data.physical_properties.type,
            r.data.physical_properties.color,
            r.data.physical_properties.pattern,
            r.data.physical_properties.brightness || 'N/A',
            r.data.physical_properties.priceRange,
            `"${r.data.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
            r.data.tags.join('; ')
        ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `marble-analysis-${Date.now()}.csv`);
};
