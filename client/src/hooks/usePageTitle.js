import { useEffect } from "react";

const SITE_NAME = "BookStore";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title 
      ? `${title} | ${SITE_NAME}` 
      : `${SITE_NAME} – Buy Books Online`;
  }, [title]);
}