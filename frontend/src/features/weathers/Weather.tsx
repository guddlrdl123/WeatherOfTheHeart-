import Sunny from './SunnyWeather'
import Rain from './RainWeather'
import Cloud from './CloudWeather'
import Sunset from './SunsetWeather'
import Night from './NightWeather'
import Dawn from './DawnWeather'
import CherryBlossom from './CherryBlossomWeather'
import type { WeatherKey } from '../../types/weather'

type Props = {
  weather: WeatherKey
}

export default function Weather({ weather }: Props) {
  return (
    <div className="absolute inset-0 z-0">
      {weather === 'sunny' && <Sunny />}
      {weather === 'rain' && <Rain />}
      {weather === 'cloud' && <Cloud />}
      {weather === 'sunset' && <Sunset />}
      {weather === 'night' && <Night />}
      {weather === 'dawn' && <Dawn />}
      {weather === 'cherry' && <CherryBlossom />}
    </div>
  )
}
