const handleComboDiscountValue = (item, newQuantity = null, combo) => {
    if (combo) {
        if (newQuantity ? newQuantity <= combo.limitCombo : item.quantity <= combo.limitCombo) {
            let discountValue = 0
            for (let i = 0; i < combo.discountCombos.length; i++) {
                if (newQuantity ? newQuantity >= combo.discountCombos[i].quantity : item.quantity >= combo.discountCombos[i].quantity) {
                    discountValue = combo.discountCombos[i].discountValue
                }
            }
            if (combo.comboType === 'percentage') {
                return (
                    (newQuantity ? newQuantity : item.quantity) *
                    item.variant.price *
                    (1 - discountValue / 100) *
                    (1 - item.variant.product.discount / 100)
                )
            } else {
                return (newQuantity ? newQuantity : item.quantity) * item.variant.price - discountValue * (1 - item.variant.product.discount / 100)
            }
        }
    }
    return (newQuantity ? newQuantity : item.quantity) * item.variant.price * (1 - item.variant.product.discount / 100)
}

module.exports = {
    handleComboDiscountValue,
}
