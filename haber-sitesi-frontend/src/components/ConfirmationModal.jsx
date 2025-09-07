import React from 'react'

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Onayla", 
  cancelText = "İptal",
  type = "warning" // "warning", "danger", "info"
}) => {
  if (!isOpen) return null

  const typeStyles = {
    warning: {
      icon: "⚠️",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
      confirmBg: "bg-yellow-600 hover:bg-yellow-700"
    },
    danger: {
      icon: "🗑️",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      confirmBg: "bg-red-600 hover:bg-red-700"
    },
    info: {
      icon: "ℹ️",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      confirmBg: "bg-blue-600 hover:bg-blue-700"
    }
  }

  const style = typeStyles[type]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
        <div className={`${style.bgColor} p-6 rounded-t-2xl`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 ${style.bgColor} ${style.iconColor} rounded-full flex items-center justify-center text-2xl border-2 border-current`}>
              {style.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed mb-6">{message}</p>
          
          <div className="flex space-x-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`px-4 py-2 ${style.confirmBg} text-white rounded-xl transition-colors font-medium`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
