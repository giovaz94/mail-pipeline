#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

K8S_DIR="./k8s"

check_error() {
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error during command execution. Stopping.${NC}"
    exit 1
  fi
}

check_kubectl() {
  if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl is not installed. Install it before proceeding.${NC}"
    exit 1
  fi
}

deploy_global() {
  echo -e "${YELLOW}Executing GLOBAL deployment...${NC}"

  echo -e "${GREEN}Deploying role...${NC}"
  kubectl apply -f "$K8S_DIR/roles" && check_error
  
  echo -e "${GREEN}Deploying prometheus...${NC}"
  kubectl apply -f "$K8S_DIR/prometheus" && check_error

  echo -e "${GREEN}Deploying redis...${NC}"
  kubectl apply -f "$K8S_DIR/redis" && check_error

  echo -e "${GREEN}Deploying entrypoint...${NC}"
  kubectl apply -f "$K8S_DIR/entrypoint" && check_error
  
  echo -e "${GREEN}Deploying parser...${NC}"
  kubectl apply -f "$K8S_DIR/parser/parser.yaml" && check_error
  
  echo -e "${GREEN}Deploying header-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/header_analyzer/header-analyzer.yaml" && check_error
  
  echo -e "${GREEN}Deploying attachment-manager..${NC}"
  kubectl apply -f "$K8S_DIR/attachment_manager/attachment-manager.yaml" && check_error
  
  echo -e "${GREEN}Deploying link-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/link_analyzer/link-analyzer.yaml" && check_error

  echo -e "${GREEN}Deploying text-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/text_analyzer/text-analyzer.yaml" && check_error
  
  echo -e "${GREEN}Deploying image-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/image_analyzer/image-analyzer.yaml" && check_error

  echo -e "${GREEN}Deploying message-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/message_analyzer/message-analyzer.yaml" && check_error

  echo -e "${GREEN}Deploying virus-scanner...${NC}"
  kubectl apply -f "$K8S_DIR/virus_scanner/virus-scanner.yaml" && check_error

  echo -e "${GREEN}Deploying gs-algorithm...${NC}"
  kubectl apply -f "$K8S_DIR/gs-algorithm" && check_error
  
  echo -e "${GREEN}Deployment completed successfully!${NC}"
}

deploy_local() {
  echo -e "${YELLOW}Executing LOCAL deployment...${NC}"

  echo -e "${GREEN}Deploying role...${NC}"
  kubectl apply -f "$K8S_DIR/roles" && check_error
  
  echo -e "${GREEN}Deploying prometheus...${NC}"
  kubectl apply -f "$K8S_DIR/prometheus" && check_error

  echo -e "${GREEN}Deploying redis...${NC}"
  kubectl apply -f "$K8S_DIR/redis" && check_error

  echo -e "${GREEN}Deploying entrypoint...${NC}"
  kubectl apply -f "$K8S_DIR/entrypoint" && check_error
  
  echo -e "${GREEN}Deploying parser...${NC}"
  kubectl apply -f "$K8S_DIR/parser" && check_error
  
  echo -e "${GREEN}Deploying header-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/header_analyzer" && check_error
  
  echo -e "${GREEN}Deploying attachment-manager..${NC}"
  kubectl apply -f "$K8S_DIR/attachment_manager" && check_error
  
  echo -e "${GREEN}Deploying link-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/link_analyzer" && check_error

  echo -e "${GREEN}Deploying text-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/text_analyzer" && check_error
  
  echo -e "${GREEN}Deploying image-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/image_analyzer" && check_error

  echo -e "${GREEN}Deploying message-analyzer...${NC}"
  kubectl apply -f "$K8S_DIR/message_analyzer" && check_error

  echo -e "${GREEN}Deploying virus-scanner...${NC}"
  kubectl apply -f "$K8S_DIR/virus_scanner" && check_error
  
  echo -e "${GREEN}Deployment completed successfully!${NC}"
}

deploy_services_only() {
  echo -e "${YELLOW}Executing SERVICES-ONLY deployment...${NC}"

  echo -e "${GREEN}Deploying prometheus...${NC}"
  kubectl apply -f "$K8S_DIR/prometheus" && check_error


  echo -e "${GREEN}Deploying entrypoint...${NC}"
  kubectl apply -f "$K8S_DIR/entrypoint" && check_error
  
  echo -e "${GREEN}Deploying auth...${NC}"
  kubectl apply -f "$K8S_DIR/auth/auth.yaml" && check_error
  
  echo -e "${GREEN}Deploying persistence...${NC}"
  kubectl apply -f "$K8S_DIR/persistence/persistence.yaml" && check_error
  
  echo -e "${GREEN}Deploying recommender...${NC}"
  kubectl apply -f "$K8S_DIR/recommender/recommender.yaml" && check_error

  echo -e "${GREEN}Deploying persistence...${NC}"
  kubectl apply -f "$K8S_DIR/image/image.yaml" && check_error
  
  echo -e "${GREEN}Deploying webUI...${NC}"
  kubectl apply -f "$K8S_DIR/webUI/webUI.yaml" && check_error
  
  echo -e "${GREEN}Services-only deployment completed successfully!${NC}"
}

undeploy_all() {
  echo -e "${YELLOW}Undeploying all components...${NC}"

  echo -e "${GREEN}Removing virus-scanner...${NC}"
  kubectl delete -f "$K8S_DIR/virus_scanner" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/virus_scanner/virus-scanner.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing message-analyzer...${NC}"
  kubectl delete -f "$K8S_DIR/message_analyzer" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/message_analyzer/message-analyzer.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing image-analyzer...${NC}"
  kubectl delete -f "$K8S_DIR/image_analyzer" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/image_analyzer/image-analyzer.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing text-analyzer...${NC}"
  kubectl delete -f "$K8S_DIR/text_analyzer" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/text_analyzer/text-analyzer.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing link-analyzer...${NC}"
  kubectl delete -f "$K8S_DIR/link_analyzer" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/link_analyzer/link-analyzer.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing attachment-manager...${NC}"
  kubectl delete -f "$K8S_DIR/attachment_manager" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/attachment_manager/attachment-manager.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing header-analyzer...${NC}"
  kubectl delete -f "$K8S_DIR/header_analyzer" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/header_analyzer/header-analyzer.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing parser...${NC}"
  kubectl delete -f "$K8S_DIR/parser" --ignore-not-found=true
  kubectl delete -f "$K8S_DIR/parser/parser.yaml" --ignore-not-found=true
  
  echo -e "${GREEN}Removing entrypoint...${NC}"
  kubectl delete -f "$K8S_DIR/entrypoint" --ignore-not-found=true
  
  echo -e "${GREEN}Removing gs-algorithm...${NC}"
  kubectl delete -f "$K8S_DIR/gs-algorithm" --ignore-not-found=true
  
  echo -e "${GREEN}Removing redis...${NC}"
  kubectl delete -f "$K8S_DIR/redis" --ignore-not-found=true
  
  echo -e "${GREEN}Removing prometheus...${NC}"
  kubectl delete -f "$K8S_DIR/prometheus" --ignore-not-found=true
  
  echo -e "${GREEN}All components successfully removed!${NC}"
}

main() {
  check_kubectl
  
  if [ $# -ne 1 ]; then
    echo -e "${RED}Provide one argument: 'global', 'local', 'services', or 'undeploy'${NC}"
    echo "Example: $0 global"
    exit 1
  fi

  case "$1" in
    "global")
      deploy_global
      ;;
    "local")
      deploy_local
      ;;
    "services")
      deploy_services_only
      ;;
    "undeploy")
      undeploy_all
      ;;
    *)
      echo -e "${RED}Invalid argument. Use 'global', 'local', 'services', or 'undeploy'${NC}"
      echo "Example: $0 global"
      exit 1
      ;;
  esac
}

main "$@"