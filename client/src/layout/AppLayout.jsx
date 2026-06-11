import { useCallback, useEffect } from "react";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import Sidebar from "./Sidebar.jsx";
import { useUIStore } from "../store/uiStore.js";
import AddChatModal from "../pages/AddChatModal.jsx";
import DetailsModal from "../pages/DetailsModal.jsx";


const AppLayout = () => {

  const { isDetailsModal, isAddChatModalOpen } = useUIStore();

  return (

    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">


      <Sidebar />
      <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <LeftPanel />
      </div>
      <div className="w-2/3 flex flex-col">
        <RightPanel />
      </div>

      {isAddChatModalOpen &&
        <AddChatModal />}

      {isDetailsModal &&
        <DetailsModal />}


    </div>
  );
};

export default AppLayout;
