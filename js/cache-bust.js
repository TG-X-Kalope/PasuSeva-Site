document.addEventListener("DOMContentLoaded", () => {
    const bustCache = () => {
        const version = Date.now();

        // CSS files
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const baseHref = link.href.split('?')[0];
            link.href = `${baseHref}?v=${version}`;
        });

        // JS files
        document.querySelectorAll('script[src]').forEach(script => {
            const baseSrc = script.src.split('?')[0];
            const newScript = document.createElement('script');
            newScript.src = `${baseSrc}?v=${version}`;
            newScript.defer = script.defer;
            newScript.async = script.async;
            script.replaceWith(newScript);
        });
    };

    bustCache();
});
