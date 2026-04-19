<script>
import { h } from 'vue'
import { renderGenotypeSymbol } from '@/utils/format'

export default {
  props: {
    symbol: { type: String, default: null }
  },
  setup(props) {
    return () => renderGenotypeSymbol(props.symbol)
  }
}
</script>
