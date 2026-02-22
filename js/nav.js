async function loadNavbar(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    document.querySelector("#navbar").innerHTML = html;
  } catch (err) {
    console.error('Failed to load HTML:', err);
    // Optional: show fallback content
    document.querySelector("#navbar").innerHTML = '<a href="./">Error loading content</a>';
  }
}
