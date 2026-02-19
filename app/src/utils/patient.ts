export function getStatusColor(status?: string): string {
  switch (status) {
    case "En traitement":
      return "processing";
    case "Rémission":
      return "success";
    case "Surveillance":
      return "warning";
    default:
      return "default";
  }
}
