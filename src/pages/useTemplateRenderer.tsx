const useTemplateRenderer = (template: any) => {
  const renderPreview = () => {
    if (!template) return "";

    switch (template.output_mode) {
      case "html":
        return template.html_code || "";

      case "zpl":
        return template.zpl_code || "";

      default:
        return template.html_code || "";
    }
  };

  return { renderPreview };
};

export default useTemplateRenderer;