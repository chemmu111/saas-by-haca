
const backendUrl = 'http://localhost:5000';

const normalizeMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
        // Already a full URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const urlObj = new URL(url);

            // If URL points to production/ngrok but we're running locally, rewrite to use current backend
            if (urlObj.hostname.includes('onrender.com') || urlObj.hostname.includes('ngrok')) {
                return `${backendUrl}${urlObj.pathname}`;
            }

            return url;
        }
        return `${backendUrl}/${url}`;
    } catch (error) {
        console.warn('Error normalizing media URL:', url, error);
        return `${backendUrl}/uploads/${url}`;
    }
};

const inputs = [
    'https://muscly-genuinely-turner.ngrok-free.dev/uploads/image-1764912427739-61041836.mp4',
    'https://geneva-incapacious-romana.ngrok-free.dev/uploads/image-1764744050765-116029246.mp4',
    'https://geneva-incapacious-romana.ngrok-free.dev/uploads/image-1764135807636-612312795.mp4'
];

inputs.forEach(input => {
    console.log(`Input:  ${input}`);
    console.log(`Output: ${normalizeMediaUrl(input)}`);
    console.log('---');
});
