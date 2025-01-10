fetch('json/styles.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load styles.json: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const head = document.head;
    data.cssFiles.forEach(file => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = file;
      head.appendChild(link);
    });
    console.log('successfully');
  })
  .catch(error => {
    console.error('Error loading CSS files:', error);
  });
